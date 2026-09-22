import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendPushToAdmins } from "./push";

const router: IRouter = Router();

// Basic sanity check: digits, spaces, +, -, ( ) — 8 to 20 characters long.
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

// Request types that funnel into this shared table + admin tab.
const SERVICE_TYPES: Record<string, { pushTitle: string; label: string }> = {
  digital_store_project: { pushTitle: "🛒 طلب مشروع شحن رقمي جديد", label: "مشروع شحن رقمي جاهز" },
  mobile_app_dev: { pushTitle: "📱 طلب تطوير تطبيق جوال جديد", label: "تطوير تطبيق جوال" },
  website_dev: { pushTitle: "💻 طلب تطوير موقع جديد", label: "تطوير موقع" },
  salary_withdrawal: { pushTitle: "💰 طلب سحب راتب جديد", label: "سحب راتب" },
};

async function insertAndNotify(res: Response, phoneRaw: string, serviceType: string, message: string | null) {
  const result = await pool.query(
    `INSERT INTO digital_store_project_requests (phone, service_type, message) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [phoneRaw, serviceType, message]
  );
  const row = result.rows[0];
  res.json({ ok: true, id: row.id });

  const submittedAt = new Date(row.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  const meta = SERVICE_TYPES[serviceType];
  sendPushToAdmins(
    meta.pushTitle,
    `رقم الهاتف: ${phoneRaw}\nالتاريخ: ${submittedAt}`,
    "/admin?tab=digitalprojects"
  ).catch(() => {});
}

// ─── PUBLIC: submit a new "ready-made digital store project" lead (legacy path, unchanged) ──
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
    await insertAndNotify(res, phoneRaw, "digital_store_project", null);
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في إرسال الطلب: " + err.message });
  }
});

// ─── PUBLIC: generic submit for any of the supported sections ──────────────
// Used by: mobile app dev form, website dev form, salary withdrawal form.
router.post("/service-requests", async (req: Request, res: Response): Promise<void> => {
  try {
    const serviceType = (req.body?.serviceType ?? "").toString().trim();
    if (!SERVICE_TYPES[serviceType]) {
      res.status(400).json({ error: "نوع الطلب غير صالح" });
      return;
    }
    const phoneRaw = (req.body?.phone ?? "").toString().trim();
    if (!phoneRaw) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }
    if (!PHONE_RE.test(phoneRaw)) {
      res.status(400).json({ error: "رقم الهاتف غير صالح، تأكد من إدخاله مع مفتاح الدولة" });
      return;
    }
    const message = (req.body?.message ?? "").toString().trim().slice(0, 6000) || null;
    await insertAndNotify(res, phoneRaw, serviceType, message);
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في إرسال الطلب: " + err.message });
  }
});

// ─── ADMIN: list requests (paginated, optional service type + status filter) ─
router.get("/admin/service-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "all";
  const serviceType = (req.query.serviceType as string) || "all";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;
  try {
    const whereParams: any[] = [];
    const conditions: string[] = [];
    if (status !== "all") {
      whereParams.push(status);
      conditions.push(`status = $${whereParams.length}`);
    }
    if (serviceType !== "all") {
      whereParams.push(serviceType);
      conditions.push(`service_type = $${whereParams.length}`);
    }
    const whereClause = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

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
        serviceType: r.service_type,
        message: r.message,
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

// ─── ADMIN: update request status (e.g. mark as contacted) ─────────────────
router.patch("/admin/service-requests/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

// Legacy public POST path above is kept for backward compatibility.
// The old admin GET/PATCH paths were only ever used by this project's own
// admin UI, which now calls /admin/service-requests directly — no legacy
// admin route needed.

export default router;
