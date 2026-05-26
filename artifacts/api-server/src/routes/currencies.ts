import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

// Auto-migrate: ensure is_active column exists (safe, idempotent)
pool.query("ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
  .catch(() => {/* already exists or no permission — ignore */});

// Auto-seed: if currencies table is empty, seed from settings table
(async () => {
  try {
    const count = await pool.query("SELECT COUNT(*) FROM currencies");
    if (parseInt(count.rows[0].count) === 0) {
      const s = await pool.query("SELECT * FROM settings LIMIT 1");
      if (s.rows.length > 0) {
        const r = s.rows[0];
        const seed = [
          { code: "USD", nameAr: "دولار أمريكي", nameEn: "US Dollar",        rate: 1 },
          { code: "TRY", nameAr: "ليرة تركية",   nameEn: "Turkish Lira",      rate: parseFloat(r.usd_to_try)  || 32 },
          { code: "SYP", nameAr: "ليرة سورية",   nameEn: "Syrian Pound",      rate: parseFloat(r.usd_to_syp)  || 13000 },
          { code: "EUR", nameAr: "يورو",           nameEn: "Euro",              rate: parseFloat(r.usd_to_eur)  || 0.92 },
          { code: "OMR", nameAr: "ريال عماني",    nameEn: "Omani Rial",        rate: parseFloat(r.usd_to_omr)  || 0.385 },
          { code: "MAD", nameAr: "درهم مغربي",    nameEn: "Moroccan Dirham",   rate: parseFloat(r.usd_to_mad)  || 10 },
          { code: "DZD", nameAr: "دينار جزائري",  nameEn: "Algerian Dinar",    rate: parseFloat(r.usd_to_dzd)  || 135 },
          { code: "ILS", nameAr: "شيكل",           nameEn: "Israeli Shekel",    rate: parseFloat(r.usd_to_ils)  || 3.7 },
          { code: "IQD", nameAr: "دينار عراقي",   nameEn: "Iraqi Dinar",       rate: parseFloat(r.usd_to_iqd)  || 1310 },
          { code: "SAR", nameAr: "ريال سعودي",    nameEn: "Saudi Riyal",       rate: parseFloat(r.usd_to_sar)  || 3.75 },
          { code: "EGP", nameAr: "جنيه مصري",     nameEn: "Egyptian Pound",    rate: parseFloat(r.usd_to_egp)  || 50.9 },
          { code: "JOD", nameAr: "دينار أردني",   nameEn: "Jordanian Dinar",   rate: parseFloat(r.usd_to_jod)  || 0.71 },
        ];
        for (const c of seed) {
          if (c.rate > 0) {
            await pool.query(
              "INSERT INTO currencies (code, name_ar, name_en, usd_rate, is_active) VALUES ($1,$2,$3,$4,true) ON CONFLICT (code) DO NOTHING",
              [c.code, c.nameAr, c.nameEn, c.rate]
            );
          }
        }
      }
    }
  } catch { /* ignore seed errors */ }
})();

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
