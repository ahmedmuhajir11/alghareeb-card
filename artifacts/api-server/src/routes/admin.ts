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

async function getCurrencyRates(): Promise<Record<string, number>> {
  const res = await pool.query("SELECT code, usd_rate FROM currencies WHERE is_active = true");
  const map: Record<string, number> = { USD: 1 };
  for (const row of res.rows) {
    const rate = parseFloat(row.usd_rate);
    if (rate > 0) map[row.code.toUpperCase()] = rate;
  }
  return map;
}

function rateForCurrency(currency: string, rates: Record<string, number>): number | null {
  const c = (currency || "").toUpperCase();
  const v = rates[c];
  return typeof v === "number" && v > 0 ? v : null;
}

function convertCurrency(amount: number, from: string, to: string, rates: Record<string, number>): number | null {
  if (!isFinite(amount)) return null;
  if ((from || "").toUpperCase() === (to || "").toUpperCase()) return amount;
  const fromRate = rateForCurrency(from, rates);
  const toRate = rateForCurrency(to, rates);
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
    const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "12h" });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 12 * 60 * 60 * 1000,
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
    let q = `SELECT d.*,
              u.name as user_name, u.email as user_email, u.account_number as user_account,
              u.currency as user_currency,
              wt.amount as credited_amount,
              COALESCE(uc.deposit_rate, uc.usd_rate) AS user_deposit_rate,
              COALESCE(dc.deposit_rate, dc.usd_rate) AS dep_deposit_rate
             FROM deposit_requests d
             LEFT JOIN users u ON u.id = d.user_id
             LEFT JOIN wallet_transactions wt ON wt.ref_id = d.id AND wt.type = 'deposit'
             LEFT JOIN currencies uc ON uc.code = u.currency
             LEFT JOIN currencies dc ON dc.code = d.currency`;
    const params: any[] = [];
    if (status !== "all") {
      params.push(status);
      q += ` WHERE d.status = $${params.length}`;
    }
    q += " ORDER BY d.created_at DESC";
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => {
      // Actual credited amount (approved deposits)
      let creditedAmount: number | null = r.credited_amount != null ? parseFloat(r.credited_amount) : null;
      // Estimated credited amount for pending/rejected deposits
      if (creditedAmount == null && r.user_currency) {
        const amt = parseFloat(r.amount);
        const depCurrency: string = r.currency;
        const userCurrency: string = r.user_currency;
        if (depCurrency === userCurrency) {
          creditedAmount = amt;
        } else {
          const depRate: number = r.dep_deposit_rate ? parseFloat(r.dep_deposit_rate) : 1;
          const userRate: number = r.user_deposit_rate ? parseFloat(r.user_deposit_rate) : 1;
          if (depCurrency === "USD") {
            creditedAmount = amt * userRate;
          } else if (userCurrency === "USD") {
            creditedAmount = amt / depRate;
          } else {
            creditedAmount = (amt / depRate) * userRate;
          }
        }
      }
      return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userAccount: r.user_account,
        userCurrency: r.user_currency ?? null,
        creditedAmount,
        paymentMethodName: r.payment_method_name,
        amount: parseFloat(r.amount),
        currency: r.currency,
        receiptUrl: r.receipt_url,
        senderName: r.sender_name,
        status: r.status,
        adminNote: r.admin_note,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }));
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
        // Use deposit_rate if set, otherwise fall back to usd_rate
        const currRates = await client.query("SELECT code, usd_rate, deposit_rate FROM currencies");
        const rMap: Record<string, number> = { USD: 1 };
        for (const row of currRates.rows) {
          const rate = row.deposit_rate != null ? parseFloat(row.deposit_rate) : parseFloat(row.usd_rate);
          if (rate > 0) rMap[row.code] = rate;
        }
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
    let q = `SELECT o.*, u.name as user_name, u.email as user_email, u.account_number as user_account,
                    p.label as p_label, p.quantity as p_quantity
             FROM orders o
             LEFT JOIN users u ON u.id = o.user_id
             LEFT JOIN packages p ON p.id = o.package_id`;
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
      packageLabel: r.p_label || null,
      packageQuantity: r.p_quantity ? parseFloat(r.p_quantity) : null,
      targetId: r.target_id,
      amount: parseFloat(r.amount),
      currency: r.currency,
      status: r.status,
      notes: r.notes || null,
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

// ── One-time fix: force-set real token on ALL YazanCard items/packages ────────
router.post("/admin/fix-yazancard-token", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const realToken = process.env.YAZANCARD_TOKEN?.trim();
  if (!realToken) { res.status(400).json({ error: "YAZANCARD_TOKEN غير موجود في .env" }); return; }

  // Show current state for debugging
  const before = await pool.query(
    `SELECT 'items' AS tbl, id, name_ar, LEFT(api_key,10) AS key_prefix, api_endpoint
     FROM items WHERE api_endpoint IS NOT NULL AND api_endpoint <> ''
     UNION ALL
     SELECT 'packages', id, label, LEFT(api_key,10), api_endpoint
     FROM packages WHERE api_endpoint IS NOT NULL AND api_endpoint <> ''`
  );

  // Force-update ALL entries that have any api_endpoint (YazanCard or otherwise) with wrong token
  const [r1, r2] = await Promise.all([
    pool.query(
      `UPDATE packages SET api_key=$1
       WHERE api_endpoint IS NOT NULL AND api_endpoint <> ''
         AND (api_key IS NULL OR api_key <> $1)`,
      [realToken]
    ),
    pool.query(
      `UPDATE items SET api_key=$1
       WHERE api_endpoint IS NOT NULL AND api_endpoint <> ''
         AND (api_key IS NULL OR api_key <> $1)`,
      [realToken]
    ),
  ]);

  res.json({
    message: "تم التحديث القطعي",
    packagesUpdated: r1.rowCount,
    itemsUpdated: r2.rowCount,
    tokenPrefix: realToken.slice(0, 8) + "...",
    beforeState: before.rows,
  });
});

// ── Diagnostic: test YazanCard API for a specific order (no side effects) ─────
router.get("/admin/orders/:id/diagnose", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }

  const ordRes = await pool.query(
    `SELECT o.target_id, o.item_name, o.package_name,
            i.api_endpoint AS item_ep, i.api_key AS item_key,
            p.api_endpoint AS pkg_ep, p.api_key AS pkg_key
     FROM orders o
     LEFT JOIN items i ON i.name_ar = o.item_name
     LEFT JOIN packages p ON p.label = o.package_name AND p.item_id = i.id
     WHERE o.id = $1`,
    [id]
  );
  if (ordRes.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
  const r = ordRes.rows[0];

  const apiEndpoint: string = r.pkg_ep || r.item_ep || "";
  const apiKey: string = r.pkg_key || r.item_key || "";

  // Show masked token info
  const tokenInfo = apiKey
    ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars)`
    : "غير موجود";

  if (!apiEndpoint || !apiKey) {
    res.json({ error: "لا توجد بيانات API", tokenInfo, apiEndpoint });
    return;
  }

  // Make test call
  const chargeUrl = new URL(apiEndpoint.replace(/\/params\/?$/, "") + "/params");
  chargeUrl.searchParams.set("qty", "1");
  chargeUrl.searchParams.set("order_uuid", crypto.randomUUID());
  if (r.target_id) chargeUrl.searchParams.set("player_id", String(r.target_id));

  let rawText = "";
  let httpStatus = 0;
  try {
    const cleanKey = apiKey.trim();
    chargeUrl.searchParams.set("api_token", cleanKey);
    const apiRes = await fetch(chargeUrl.toString(), {
      method: "GET",
      headers: {
        "Api-Token": cleanKey,
        "api-token": cleanKey,
        "Authorization": `Bearer ${cleanKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });
    httpStatus = apiRes.status;
    rawText = await apiRes.text();
  } catch (err: any) {
    rawText = `Connection error: ${err.message}`;
  }

  let parsed: unknown = null;
  try { parsed = JSON.parse(rawText); } catch { parsed = null; }

  res.json({
    orderId: id,
    tokenInfo,
    chargeUrl: chargeUrl.toString(),
    httpStatus,
    rawResponse: rawText.slice(0, 1000),
    parsedResponse: parsed,
  });
});

// ── Retry auto-charge for a pending order ────────────────────────────────────
router.post("/admin/orders/:id/retry-charge", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }

  const client = await pool.connect();
  try {
    // Load order + item API credentials
    const ordRes = await client.query(
      `SELECT o.*, i.api_endpoint AS item_api_endpoint, i.api_key AS item_api_key,
              p.api_endpoint AS pkg_api_endpoint, p.api_key AS pkg_api_key
       FROM orders o
       LEFT JOIN items i ON i.name_ar = o.item_name
       LEFT JOIN packages p ON p.label = o.package_name AND p.item_id = i.id
       WHERE o.id = $1`,
      [id]
    );
    if (ordRes.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); client.release(); return; }
    const order = ordRes.rows[0];
    if (order.status !== "pending") { res.status(400).json({ error: "الطلب ليس في حالة انتظار" }); client.release(); return; }

    // Resolve API credentials: prefer package-level, fallback to item-level
    const apiEndpoint: string | null = order.pkg_api_endpoint || order.item_api_endpoint || null;
    const apiKey: string | null = order.pkg_api_key || order.item_api_key || null;

    if (!apiEndpoint || !apiKey) {
      res.status(400).json({ error: "لا توجد بيانات API مرتبطة بهذا الطلب" });
      client.release();
      return;
    }

    client.release();

    // Make the charge API call
    let apiData: Record<string, unknown> = {};
    let httpOk = false;
    let errMsg = "خطأ غير معروف";

    try {
      const isYazanCard = apiEndpoint.includes("yazancard.com") || apiEndpoint.includes("/client/api/");
      let apiRes: globalThis.Response;

      if (isYazanCard) {
        const chargeEndpoint = apiEndpoint.replace(/\/params\/?$/, "") + "/params";
        const chargeUrl = new URL(chargeEndpoint);
        chargeUrl.searchParams.set("qty", "1");
        chargeUrl.searchParams.set("order_uuid", crypto.randomUUID());
        if (order.target_id) chargeUrl.searchParams.set("player_id", String(order.target_id));
        apiRes = await fetch(chargeUrl.toString(), {
          method: "GET",
          headers: { "Api-Token": apiKey, "api-token": apiKey },
          signal: AbortSignal.timeout(20000),
        });
      } else {
        apiRes = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey, order_id: order.id,
            item_name: order.item_name, package_name: order.package_name,
            target_id: order.target_id,
          }),
          signal: AbortSignal.timeout(15000),
        });
      }

      apiData = await apiRes.json().catch(() => ({})) as Record<string, unknown>;
      httpOk = apiRes.ok;

      const explicitFailure =
        apiData?.["success"] === false || apiData?.["status"] === "FAILED" ||
        apiData?.["status"] === "failed" || apiData?.["status"] === "error" ||
        apiData?.["code"] === 0;

      if (httpOk && !explicitFailure) {
        const txId = String(apiData?.["order_id"] ?? apiData?.["transaction_id"] ?? "N/A");
        await pool.query(
          `UPDATE orders SET status='completed', notes=$1, updated_at=NOW() WHERE id=$2`,
          [`تم الشحن تلقائياً - معرف العملية: ${txId}`, id]
        );
        sendPushToUser(order.user_id, "✅ تم الشحن التلقائي", `تم تنفيذ طلبك: ${order.item_name}${order.package_name ? " - " + order.package_name : ""}`, "/orders").catch(() => {});
        res.json({ success: true, status: "completed", apiResponse: apiData });
      } else {
        errMsg = String(apiData?.["msg"] ?? apiData?.["error"] ?? apiData?.["message"] ?? "خطأ غير معروف");
        await pool.query(
          `UPDATE orders SET notes=$1, updated_at=NOW() WHERE id=$2`,
          [`فشل الشحن التلقائي: ${errMsg} - سيتم المعالجة يدوياً`, id]
        );
        res.status(502).json({ success: false, error: errMsg, apiResponse: apiData });
      }
    } catch (apiErr: any) {
      await pool.query(
        `UPDATE orders SET notes=$1, updated_at=NOW() WHERE id=$2`,
        [`فشل الاتصال بـ API: ${apiErr?.message ?? "timeout"}`, id]
      ).catch(() => {});
      res.status(502).json({ success: false, error: apiErr?.message ?? "timeout" });
    }
  } catch (err: any) {
    client.release();
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Stats ──────────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const client = await pool.connect();
  try {
    const [
      usersTotal,
      usersToday,
      usersWeek,
      usersMonth,
      ordersTotal,
      ordersToday,
      ordersWeek,
      ordersPending,
      salesTotal,
      salesToday,
      salesWeek,
      depositsPending,
      depositsApprovedTotal,
      topServices,
    ] = await Promise.all([
      client.query(`SELECT COUNT(*) AS count FROM users`),
      client.query(`SELECT COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '1 day'`),
      client.query(`SELECT COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
      client.query(`SELECT COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'`),
      client.query(`SELECT COUNT(*) AS count FROM orders`),
      client.query(`SELECT COUNT(*) AS count FROM orders WHERE created_at >= NOW() - INTERVAL '1 day'`),
      client.query(`SELECT COUNT(*) AS count FROM orders WHERE created_at >= NOW() - INTERVAL '7 days'`),
      client.query(`SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'`),
      client.query(`SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM orders WHERE status IN ('approved','completed') AND currency = 'TRY'`),
      client.query(`SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM orders WHERE status IN ('approved','completed') AND currency = 'TRY' AND created_at >= NOW() - INTERVAL '1 day'`),
      client.query(`SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM orders WHERE status IN ('approved','completed') AND currency = 'TRY' AND created_at >= NOW() - INTERVAL '7 days'`),
      client.query(`SELECT COUNT(*) AS count FROM deposit_requests WHERE status = 'pending'`),
      client.query(`SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM deposit_requests WHERE status = 'approved'`),
      client.query(`SELECT item_name, COUNT(*) AS count FROM orders GROUP BY item_name ORDER BY count DESC LIMIT 7`),
    ]);

    res.json({
      users: {
        total: parseInt(usersTotal.rows[0].count),
        today: parseInt(usersToday.rows[0].count),
        week: parseInt(usersWeek.rows[0].count),
        month: parseInt(usersMonth.rows[0].count),
      },
      orders: {
        total: parseInt(ordersTotal.rows[0].count),
        today: parseInt(ordersToday.rows[0].count),
        week: parseInt(ordersWeek.rows[0].count),
        pending: parseInt(ordersPending.rows[0].count),
      },
      sales: {
        total: parseFloat(salesTotal.rows[0].total),
        today: parseFloat(salesToday.rows[0].total),
        week: parseFloat(salesWeek.rows[0].total),
      },
      deposits: {
        pending: parseInt(depositsPending.rows[0].count),
        approvedTotal: parseFloat(depositsApprovedTotal.rows[0].total),
      },
      topServices: topServices.rows.map((r: any) => ({
        name: r.item_name,
        count: parseInt(r.count),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// One-time migration endpoint: backfill item_name_en/tr for existing orders
router.post("/migrate-item-names", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      UPDATE orders o
      SET item_name_en = i.name_en,
          item_name_tr = i.name_tr
      FROM items i
      WHERE i.name_ar = o.item_name
    `);
    res.json({ ok: true, updated: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
