import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";
import { objectStorageClient } from "../lib/objectStorage";
import { sendPushToAdmins } from "./push";

const router: IRouter = Router();

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const USE_OBJECT_STORAGE = !!BUCKET_ID;
const LOCAL_UPLOADS_DIR = process.env.UPLOAD_DIR ||
  (process.env.FLY_APP_NAME
    ? "/app/artifacts/api-server/uploads"
    : path.join(process.cwd(), "uploads"));
if (!USE_OBJECT_STORAGE) fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only images allowed"));
  },
});

async function saveFile(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const ext = path.extname(originalname) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  if (USE_OBJECT_STORAGE) {
    const objectName = `uploads/${filename}`;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    await bucket.file(objectName).save(buffer, { contentType: mimetype, resumable: false });
  } else {
    fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, filename), buffer);
  }
  return `/api/uploads/${filename}`;
}

// Submit deposit request
router.post("/deposits", requireUser, upload.single("receipt"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  const { paymentMethodName, amount, currency, senderName } = req.body ?? {};
  if (!paymentMethodName || !amount) {
    res.status(400).json({ error: "اسم طريقة الدفع والمبلغ مطلوبان" });
    return;
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: "المبلغ غير صالح" });
    return;
  }
  try {
    // Block if user already has a pending deposit
    const pendingRes = await pool.query(
      `SELECT id FROM deposit_requests WHERE user_id=$1 AND status='pending' LIMIT 1`,
      [user.id]
    );
    if (pendingRes.rows.length > 0) {
      res.status(409).json({
        error: "لديك طلب إيداع قيد المراجعة بالفعل، يرجى انتظار مراجعته قبل إرسال طلب جديد.",
        code: "PENDING_DEPOSIT_EXISTS",
      });
      return;
    }

    let receiptUrl: string | null = null;
    if (req.file) {
      receiptUrl = await saveFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    }
    const sentCurrency = currency || user.currency;
    const result = await pool.query(
      `INSERT INTO deposit_requests (user_id, payment_method_name, amount, currency, receipt_url, sender_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, paymentMethodName, parsedAmount, sentCurrency, receiptUrl, senderName || null]
    );
    res.json({ success: true, deposit: result.rows[0] });

    // Notify admins (fire-and-forget, never breaks the user response)
    const userLabel = user.name || user.email || `#${user.account_number ?? user.id}`;
    const title = "💰 طلب إيداع جديد";
    const body = `${userLabel} أرسل طلب إيداع: ${parsedAmount} ${sentCurrency} عبر ${paymentMethodName}`;
    sendPushToAdmins(title, body, "/admin").catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في إرسال الطلب: " + err.message });
  }
});

// Get user deposits
router.get("/deposits", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  try {
    const result = await pool.query(
      `SELECT dr.*,
              u.currency AS user_currency,
              wt.amount  AS credited_amount
       FROM deposit_requests dr
       JOIN users u ON u.id = dr.user_id
       LEFT JOIN wallet_transactions wt
              ON wt.ref_id = dr.id AND wt.type = 'deposit'
       WHERE dr.user_id = $1
       ORDER BY dr.created_at DESC`,
      [user.id]
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      paymentMethodName: r.payment_method_name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      creditedAmount: r.credited_amount != null ? parseFloat(r.credited_amount) : null,
      userCurrency: r.user_currency,
      receiptUrl: r.receipt_url,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })));
  } catch {
    res.status(500).json({ error: "خطأ في جلب الطلبات" });
  }
});

export default router;
