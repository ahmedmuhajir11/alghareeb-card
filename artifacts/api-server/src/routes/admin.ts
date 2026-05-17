import { Router, type IRouter, type Request, type Response } from "express";
import { sendPushToUser } from "./push";
import { AdminLoginBody, AdminLoginResponse, AdminLogoutResponse, AdminMeResponse } from "@workspace/api-zod";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const ADMIN_USERNAME = "abuhani";
const ADMIN_PASSWORD = "abohane12345";
const JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const COOKIE_NAME = "admin_token";

function rateForCurrency(currency: string, settings: any): number | null {
  const c = (currency || "").toUpperCase();
  if (c === "USD") return 1;
  const map: Record<string, number | undefined> = {
    TRY: settings?.usd_to_try,
    SYP: settings?.usd_to_syp,
    EUR: settings?.usd_to_eur,
    OMR: settings?.usd_to_omr,
    MAD: settings?.usd_to_mad,
    DZD: settings?.usd_to_dzd,
    ILS: settings?.usd_to_ils,
    IQD: settings?.usd_to_iqd,
    SAR: settings?.usd_to_sar,
    EGP: settings?.usd_to_egp,
    JOD: settings?.usd_to_jod,
  };
  const v = map[c];
  return typeof v === "number" && v > 0 ? v : null;
}

function convertCurrency(amount: number, from: string, to: string, settings: any): number | null {
  if (!isFinite(amount)) return null;
  if ((from || "").toUpperCase() === (to || "").toUpperCase()) return amount;
  const fromRate = rateForCurrency(from, settings);
  const toRate = rateForCurrency(to, settings);
  if (fromRate === null || toRate === null) return null;
  const usd = amount / fromRate;
  return usd * toRate;
}

const router: IRouter = Router();

function getToken(req: Request): string | null {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function verifyAdmin(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json(AdminLoginResponse.parse({ success: true, message: "تم تسجيل الدخول بنجاح" }));
    return;
  }

  res.status(401).json(AdminLoginResponse.parse({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" }));
});

router.post("/admin/logout", async (req: Request, res: Response): Promise<void> => {
  res.clearCookie(COOKIE_NAME);
  res.json(AdminLogoutResponse.parse({ success: true }));
});

router.get("/admin/me", async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  const token = getToken(req);
  const isAdmin = verifyAdmin(token);
  res.json(AdminMeResponse.parse({ isAdmin }));
});

// List all deposit requests (admin)
router.get("/admin/deposits", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "all";
  try {
    let q = `SELECT d.*, u.name as user_name, u.email as user_email, u.account_number as user_account
             FROM deposit_requests d LEFT JOIN users u ON u.id = d.user_id`;
    const params: any[] = [];
    if (status !== "all") {
      params.push(status);
      q += ` WHERE d.status = $${params.length}`;
    }
    q += " ORDER BY d.created_at DESC";
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userAccount: r.user_account,
      paymentMethodName: r.payment_method_name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      receiptUrl: r.receipt_url,
      senderName: r.sender_name,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في جلب الطلبات: " + err.message });
  }
});

// Approve or reject a deposit request (admin)
router.patch("/admin/deposits/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { action, adminNote, customMessage } = req.body ?? {};
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "الإجراء يجب أن يكون approve أو reject" });
    return;
  }

  const client = await pool.connect();
  let notifyDeposit: { userId: number; amount: number; currency: string } | null = null;
  try {
    await client.query("BEGIN");
    const dep = await client.query("SELECT * FROM deposit_requests WHERE id=$1 FOR UPDATE", [id]);
    if (dep.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const deposit = dep.rows[0];
    if (deposit.status !== "pending") {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "تمت معالجة هذا الطلب من قبل" });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await client.query(
      `UPDATE deposit_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3`,
      [newStatus, adminNote || null, id]
    );

    let creditedAmount = parseFloat(deposit.amount);
    let creditedCurrency = deposit.currency;
    if (action === "approve") {
      const sentAmount = parseFloat(deposit.amount);
      const userRes = await client.query(`SELECT currency FROM users WHERE id=$1 FOR UPDATE`, [deposit.user_id]);
      const userCurrency = (userRes.rows[0]?.currency || deposit.currency || "TRY").toUpperCase();
      const sentCurrency = (deposit.currency || userCurrency).toUpperCase();

      let amountToCredit = sentAmount;
      if (sentCurrency !== userCurrency) {
        const currRates = await client.query("SELECT code, usd_rate FROM currencies");
        const rMap: Record<string, number> = { USD: 1 };
        for (const row of currRates.rows) rMap[row.code] = parseFloat(row.usd_rate);
        const fromRate = rMap[sentCurrency] ?? null;
        const toRate = rMap[userCurrency] ?? null;
        const converted = (fromRate && toRate && isFinite(sentAmount)) ? (sentAmount / fromRate) * toRate : null;
        if (converted === null || !isFinite(converted) || converted <= 0) {
          await client.query("ROLLBACK");
          res.status(400).json({ error: `تعذّر تحويل ${sentCurrency} إلى ${userCurrency}. تأكّد من أسعار الصرف في إدارة العملات.` });
          return;
        }
        amountToCredit = converted;
      }

      creditedAmount = amountToCredit;
      creditedCurrency = userCurrency;

      await client.query(
        `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2`,
        [amountToCredit, deposit.user_id]
      );
      const description = sentCurrency !== userCurrency
        ? `إيداع عبر ${deposit.payment_method_name} (${sentAmount} ${sentCurrency} ≈ ${amountToCredit.toFixed(2)} ${userCurrency})`
        : `إيداع عبر ${deposit.payment_method_name}`;
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'deposit', $2, $3, $4)`,
        [deposit.user_id, amountToCredit, description, id]
      );
    }

    await client.query("COMMIT");
    notifyDeposit = {
      userId: deposit.user_id,
      amount: creditedAmount,
      currency: creditedCurrency,
    };
    res.json({ success: true, status: newStatus });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "خطأ في المعالجة: " + err.message });
    return;
  } finally {
    client.release();
  }

  if (notifyDeposit) {
    const { userId, amount, currency } = notifyDeposit;
    const title = action === "approve" ? "✅ تم قبول طلب الإيداع" : "❌ تم رفض طلب الإيداع";
    const defaultBody = action === "approve"
      ? `تمت إضافة ${amount} ${currency} إلى رصيدك. يمكنك الآن إجراء عمليات الشراء.`
      : `تم رفض طلب الإيداع.${adminNote ? " السبب: " + adminNote : ""}`;
    const body = (customMessage && String(customMessage).trim()) || defaultBody;
    sendPushToUser(userId, title, body, "/wallet").catch(() => {});
  }
});

// List all charge/order requests (admin)
router.get("/admin/orders", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "all";
  try {
    let q = `SELECT o.*, u.name as user_name, u.email as user_email, u.account_number as user_account
             FROM orders o LEFT JOIN users u ON u.id = o.user_id`;
    const params: any[] = [];
    if (status !== "all") {
      params.push(status);
      q += ` WHERE o.status = $${params.length}`;
    }
    q += " ORDER BY o.created_at DESC";
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userAccount: r.user_account,
      itemName: r.item_name,
      packageName: r.package_name,
      targetId: r.target_id,
      amount: parseFloat(r.amount),
      currency: r.currency,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في جلب الطلبات: " + err.message });
  }
});

// Approve or reject an order (admin). On reject: refund the user's balance.
router.patch("/admin/orders/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { action, customMessage } = req.body ?? {};
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "الإجراء يجب أن يكون approve أو reject" });
    return;
  }

  const client = await pool.connect();
  let notifyOrder: { userId: number; itemName: string; packageName: string | null; amount: number; currency: string } | null = null;
  try {
    await client.query("BEGIN");
    const ordRes = await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [id]);
    if (ordRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const order = ordRes.rows[0];
    if (order.status !== "pending") {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "تمت معالجة هذا الطلب من قبل" });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await client.query(
      `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`,
      [newStatus, id]
    );

    if (action === "reject") {
      const amount = parseFloat(order.amount);
      // Refund to user's balance
      await client.query(
        `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2`,
        [amount, order.user_id]
      );
      // Audit log: refund transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'refund', $2, $3, $4)`,
        [order.user_id, amount, `استرجاع رصيد - رفض طلب ${order.item_name}${order.package_name ? " - " + order.package_name : ""}`, id]
      );
    }

    await client.query("COMMIT");
    notifyOrder = {
      userId: order.user_id,
      itemName: order.item_name,
      packageName: order.package_name,
      amount: parseFloat(order.amount),
      currency: order.currency,
    };
    res.json({ success: true, status: newStatus });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "خطأ في المعالجة: " + err.message });
    return;
  } finally {
    client.release();
  }

  if (notifyOrder) {
    const { userId, itemName, packageName, amount, currency } = notifyOrder;
    const itemLabel = packageName ? `${itemName} - ${packageName}` : itemName;
    const title = action === "approve" ? "✅ تم تنفيذ طلب الشحن" : "❌ تم رفض طلب الشحن";
    const defaultBody = action === "approve"
      ? `تم تنفيذ طلبك: ${itemLabel}. شكراً لاستخدامك بطاقة الغريب.`
      : `تم رفض طلب ${itemLabel} وإرجاع ${amount} ${currency} إلى رصيدك.`;
    const body = (customMessage && String(customMessage).trim()) || defaultBody;
    sendPushToUser(userId, title, body, "/orders").catch(() => {});
  }
});

export default router;
