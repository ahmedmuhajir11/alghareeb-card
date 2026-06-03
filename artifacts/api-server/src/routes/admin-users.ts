import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendPushToUser } from "./push";

const router: IRouter = Router();

// List all users (with optional search & per-user totals)
router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) || "").trim().toLowerCase();
    const params: any[] = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE LOWER(u.email) LIKE $1 OR u.account_number LIKE $1 OR LOWER(u.name) LIKE $1`;
    }
    const result = await pool.query(
      `SELECT u.id, u.account_number, u.name, u.email, u.phone, u.phone_code, u.balance, u.currency,
              u.level, u.is_verified, u.is_reseller, u.api_token, u.created_at,
              COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE user_id=u.id AND type='purchase'), 0) AS total_purchases,
              COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE user_id=u.id AND type='deposit'), 0) AS total_deposits
       FROM users u ${where}
       ORDER BY u.created_at DESC
       LIMIT 500`,
      params
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      accountNumber: r.account_number,
      name: r.name,
      email: r.email,
      phone: r.phone,
      phoneCode: r.phone_code || null,
      balance: parseFloat(r.balance),
      currency: r.currency,
      level: r.level,
      isVerified: r.is_verified,
      isReseller: r.is_reseller || false,
      apiToken: r.api_token || null,
      totalPurchases: parseFloat(r.total_purchases),
      totalDeposits: parseFloat(r.total_deposits),
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregate stats across all users
router.get("/admin/users/stats", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const usersAgg = await pool.query(
      `SELECT COUNT(*)::int AS total_users,
              COUNT(*) FILTER (WHERE is_verified)::int AS verified_users,
              COALESCE(SUM(balance), 0) AS total_balance
       FROM users`
    );
    const txAgg = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type='purchase'), 0) AS total_purchases,
         COALESCE(SUM(amount) FILTER (WHERE type='deposit'), 0)  AS total_deposits
       FROM wallet_transactions`
    );
    const u = usersAgg.rows[0];
    const t = txAgg.rows[0];
    res.json({
      totalUsers: u.total_users,
      verifiedUsers: u.verified_users,
      totalBalance: parseFloat(u.total_balance),
      totalPurchases: parseFloat(t.total_purchases),
      totalDeposits: parseFloat(t.total_deposits),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset a user's password
router.put("/admin/users/:id/password", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { password } = req.body ?? {};
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 6 أحرف" });
    return;
  }
  try {
    const exists = await pool.query("SELECT id FROM users WHERE id=$1", [id]);
    if (exists.rows.length === 0) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2", [passwordHash, id]);
    res.json({ success: true, message: "تم تحديث كلمة المرور" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust a user's balance (add positive amount, deduct negative amount, or set new)
router.put("/admin/users/:id/balance", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { mode, amount, note } = req.body ?? {};
  const num = Number(amount);
  if (!Number.isFinite(num)) { res.status(400).json({ error: "المبلغ غير صحيح" }); return; }
  if (mode !== "add" && mode !== "deduct" && mode !== "set") {
    res.status(400).json({ error: "نوع العملية غير صحيح" });
    return;
  }

  try {
    const u = await pool.query("SELECT id, balance, currency FROM users WHERE id=$1", [id]);
    if (u.rows.length === 0) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    const current = parseFloat(u.rows[0].balance);
    const currency = u.rows[0].currency;

    let newBalance: number;
    let delta: number;
    if (mode === "add") { delta = num; newBalance = current + num; }
    else if (mode === "deduct") { delta = -num; newBalance = current - num; }
    else { newBalance = num; delta = num - current; }

    if (newBalance < 0) { res.status(400).json({ error: "الرصيد لا يمكن أن يكون سالباً" }); return; }

    await pool.query("UPDATE users SET balance=$1, updated_at=NOW() WHERE id=$2", [newBalance, id]);

    const txType = delta >= 0 ? "deposit" : "purchase";
    const desc = note?.trim() || (delta >= 0 ? "إضافة رصيد من الإدارة" : "خصم رصيد من الإدارة");
    await pool.query(
      "INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)",
      [id, txType, Math.abs(delta), desc]
    );

    // Notify the user
    const absDelta = Math.abs(delta);
    if (absDelta > 0) {
      const title = delta >= 0 ? "✅ تم إضافة رصيد إلى محفظتك" : "ℹ️ تم خصم رصيد من محفظتك";
      const body = delta >= 0
        ? `تمت إضافة ${absDelta.toFixed(2)} ${currency} إلى رصيدك.${note?.trim() ? " (" + note.trim() + ")" : ""} رصيدك الحالي: ${newBalance.toFixed(2)} ${currency}.`
        : `تم خصم ${absDelta.toFixed(2)} ${currency} من رصيدك.${note?.trim() ? " (" + note.trim() + ")" : ""} رصيدك الحالي: ${newBalance.toFixed(2)} ${currency}.`;
      sendPushToUser(parseInt(id), title, body, "/wallet").catch(() => {});
    }

    res.json({ success: true, balance: newBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user permanently (cascades to all related rows)
router.delete("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = parseInt(id, 10);
  if (!Number.isFinite(userId)) { res.status(400).json({ error: "معرّف غير صحيح" }); return; }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const u = await client.query("SELECT id, email, name FROM users WHERE id=$1", [userId]);
    if (u.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    await client.query("DELETE FROM push_subscriptions WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM wallet_transactions WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM identity_verifications WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM orders WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM deposit_requests WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM users WHERE id=$1", [userId]);

    await client.query("COMMIT");
    res.json({ success: true, message: `تم حذف المستخدم ${u.rows[0].name} نهائياً` });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Toggle reseller API access for a user
router.patch("/admin/users/:id/reseller", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (!Number.isFinite(userId)) { res.status(400).json({ error: "معرّف غير صحيح" }); return; }
  try {
    const u = await pool.query("SELECT id, is_reseller, api_token FROM users WHERE id=$1", [userId]);
    if (u.rows.length === 0) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    const current = u.rows[0];
    const newValue = !current.is_reseller;
    let token = current.api_token;
    if (newValue && !token) {
      // Generate a new unique token
      const crypto = await import("crypto");
      token = crypto.randomBytes(32).toString("hex");
    }
    await pool.query(
      "UPDATE users SET is_reseller=$1, api_token=COALESCE($2, api_token), updated_at=NOW() WHERE id=$3",
      [newValue, token, userId]
    );
    res.json({ success: true, isReseller: newValue, apiToken: newValue ? token : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all deposit requests
router.get("/admin/deposits", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT dr.*, u.name as user_name, u.account_number, u.phone
       FROM deposit_requests dr JOIN users u ON u.id = dr.user_id
       ORDER BY dr.created_at DESC`
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      accountNumber: r.account_number,
      phone: r.phone,
      paymentMethodName: r.payment_method_name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      receiptUrl: r.receipt_url,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve deposit → add balance
router.put("/admin/deposits/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { adminNote } = req.body ?? {};
  try {
    const dep = await pool.query("SELECT * FROM deposit_requests WHERE id=$1", [id]);
    if (dep.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
    const d = dep.rows[0];
    if (d.status !== "pending") { res.status(400).json({ error: "الطلب تمت معالجته مسبقاً" }); return; }

    // Update deposit status
    await pool.query(
      "UPDATE deposit_requests SET status='approved', admin_note=$1, updated_at=NOW() WHERE id=$2",
      [adminNote || null, id]
    );
    // Add balance to user
    await pool.query(
      "UPDATE users SET balance=balance+$1, updated_at=NOW() WHERE id=$2",
      [d.amount, d.user_id]
    );
    // Record wallet transaction
    await pool.query(
      "INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1,'deposit',$2,$3,$4)",
      [d.user_id, d.amount, `إيداع عبر ${d.payment_method_name}`, d.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject deposit
router.put("/admin/deposits/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { adminNote } = req.body ?? {};
  try {
    const dep = await pool.query("SELECT * FROM deposit_requests WHERE id=$1", [id]);
    if (dep.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
    if (dep.rows[0].status !== "pending") { res.status(400).json({ error: "الطلب تمت معالجته مسبقاً" }); return; }
    await pool.query(
      "UPDATE deposit_requests SET status='rejected', admin_note=$1, updated_at=NOW() WHERE id=$2",
      [adminNote || null, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List identity verifications
router.get("/admin/identities", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;
  try {
    const conditions = status && status !== "all" ? `WHERE iv.status=$1` : "";
    const params = status && status !== "all" ? [status] : [];
    const result = await pool.query(
      `SELECT iv.*, u.name as user_name, u.email as user_email, u.account_number, u.phone
       FROM identity_verifications iv JOIN users u ON u.id = iv.user_id
       ${conditions}
       ORDER BY iv.created_at DESC`,
      params
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      accountNumber: r.account_number,
      phone: r.phone,
      fullName: r.full_name,
      idNumber: r.id_number,
      country: r.country,
      province: r.province,
      extraInfo: r.extra_info,
      idPhotoFrontUrl: r.id_photo_front_url,
      idPhotoBackUrl: r.id_photo_back_url,
      selfieUrl: r.selfie_url,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve identity
router.put("/admin/identities/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { adminNote } = req.body ?? {};
  try {
    const iv = await pool.query("SELECT user_id, full_name FROM identity_verifications WHERE id=$1", [id]);
    if (iv.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
    await pool.query(
      "UPDATE identity_verifications SET status='approved', admin_note=$1, updated_at=NOW() WHERE id=$2",
      [adminNote || null, id]
    );
    await pool.query(
      "UPDATE users SET is_verified=true, name=$1, updated_at=NOW() WHERE id=$2",
      [iv.rows[0].full_name, iv.rows[0].user_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject identity
router.put("/admin/identities/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { adminNote } = req.body ?? {};
  try {
    await pool.query(
      "UPDATE identity_verifications SET status='rejected', admin_note=$1, updated_at=NOW() WHERE id=$2",
      [adminNote || null, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
