import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendPushToAdmins } from "./push";

const router: IRouter = Router();

// Basic sanity check: digits, spaces, +, -, ( ) — 8 to 20 characters long.
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

// ─── PUBLIC: submit a new lead ──────────────────────────────────────────────
router.post("/digital-store-projects/requests", async (req: Request, res: Response): Promise<void> => {
  try {
    const phoneRaw = (req.body?.phone ?? "").toString().trim();
    if (!phoneRaw) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }
    if (!PHONE_RE.test(phoneRaw)) {
      res.status(400).json({ error: "رقم الهاتف غير صالح، تأكد من إدخاله مع مفتاح الدولة" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO digital_store_project_requests (phone) VALUES ($1) RETURNING id, created_at`,
      [phoneRaw]
    );
    const row = result.rows[0];
    res.json({ ok: true, id: row.id });

    // Notify admins (fire-and-forget, never breaks the user response)
    const submittedAt = new Date(row.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
    sendPushToAdmins(
      "🛒 طلب مشروع شحن رقمي جديد",
      `رقم الهاتف: ${phoneRaw}\nالتاريخ: ${submittedAt}`,
      "/admin?tab=digitalprojects"
    ).catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في إرسال الطلب: " + err.message });
  }
});

// ─── ADMIN: list leads (paginated) ──────────────────────────────────────────
router.get("/admin/digital-store-projects/requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "all";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;
  try {
    const whereParams: any[] = [];
    let whereClause = "";
    if (status !== "all") {
      whereParams.push(status);
      whereClause = ` WHERE status = $${whereParams.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM digital_store_project_requests${whereClause}`,
      whereParams
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const dataParams = [...whereParams, pageSize, offset];
    const q = `SELECT * FROM digital_store_project_requests
               ${whereClause}
               ORDER BY created_at DESC
               LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    const result = await pool.query(q, dataParams);

    res.json({
      data: result.rows.map(r => ({
        id: r.id,
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في جلب الطلبات: " + err.message });
  }
});

// ─── ADMIN: update lead status (e.g. mark as contacted) ─────────────────────
router.patch("/admin/digital-store-projects/requests/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body ?? {};
  if (!id || !["new", "contacted"].includes(status)) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }
  try {
    const result = await pool.query(
      `UPDATE digital_store_project_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    res.json({ ok: true, request: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في التحديث: " + err.message });
  }
});

export default router;
