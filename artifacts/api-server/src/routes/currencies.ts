import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

// Auto-migrate: ensure is_active column exists (safe, idempotent)
pool.query("ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
  .catch(() => {/* already exists or no permission — ignore */});

// Public: only active currencies (used by profile-setup and frontend)
router.get("/currencies", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT * FROM currencies WHERE is_active = true ORDER BY id ASC"
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      code: r.code,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      usdRate: parseFloat(r.usd_rate),
      isActive: r.is_active,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: all currencies including inactive
router.get("/admin/currencies", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query("SELECT * FROM currencies ORDER BY id ASC");
    res.json(result.rows.map(r => ({
      id: r.id,
      code: r.code,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      usdRate: parseFloat(r.usd_rate),
      isActive: r.is_active,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/currencies", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { code, nameAr, nameEn, usdRate } = req.body ?? {};
  if (!code || !nameAr || !nameEn || usdRate == null) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }
  const rate = parseFloat(usdRate);
  if (isNaN(rate) || rate <= 0) {
    res.status(400).json({ error: "سعر الصرف يجب أن يكون رقماً موجباً" });
    return;
  }
  try {
    const result = await pool.query(
      "INSERT INTO currencies (code, name_ar, name_en, usd_rate, is_active) VALUES ($1,$2,$3,$4,true) RETURNING *",
      [code.toUpperCase().slice(0, 10), nameAr.slice(0, 100), nameEn.slice(0, 100), rate]
    );
    const r = result.rows[0];
    res.json({ id: r.id, code: r.code, nameAr: r.name_ar, nameEn: r.name_en, usdRate: parseFloat(r.usd_rate), isActive: r.is_active });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "رمز العملة موجود مسبقاً" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.patch("/admin/currencies/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { usdRate, nameAr, nameEn, isActive } = req.body ?? {};

  try {
    // Toggle-only update
    if (isActive !== undefined && usdRate === undefined) {
      await pool.query(
        "UPDATE currencies SET is_active=$1, updated_at=NOW() WHERE id=$2",
        [Boolean(isActive), id]
      );
      res.json({ success: true });
      return;
    }

    const rate = parseFloat(usdRate);
    if (isNaN(rate) || rate <= 0) {
      res.status(400).json({ error: "سعر الصرف غير صالح" });
      return;
    }
    const activeVal = isActive !== undefined ? Boolean(isActive) : undefined;
    await pool.query(
      `UPDATE currencies SET usd_rate=$1, name_ar=COALESCE($2,name_ar), name_en=COALESCE($3,name_en)${activeVal !== undefined ? ", is_active=$5" : ""}, updated_at=NOW() WHERE id=$4`,
      activeVal !== undefined
        ? [rate, nameAr || null, nameEn || null, id, activeVal]
        : [rate, nameAr || null, nameEn || null, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/currencies/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM currencies WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
