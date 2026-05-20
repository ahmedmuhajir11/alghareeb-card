import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";
import { sendPushToAdmins } from "./push";

const router: IRouter = Router();


// Create new order: server computes price from canonical item/package data
router.post("/orders", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  const { itemId, packageId, quantity, targetId } = req.body ?? {};

  const itemIdNum = parseInt(itemId, 10);
  if (!itemIdNum || isNaN(itemIdNum)) {
    res.status(400).json({ error: "معرّف المنتج مطلوب" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Load canonical item + settings
    const itemRes = await client.query(
      `SELECT i.id, i.name_ar, i.section_id, i.price_per_unit, i.currency_unit,
              i.api_endpoint, i.api_key, i.api_agent_id,
              s.pricing_type AS section_pricing_type
       FROM items i LEFT JOIN sections s ON s.id = i.section_id
       WHERE i.id = $1`,
      [itemIdNum]
    );
    if (itemRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }
    const item = itemRes.rows[0];

    let priceUsd = 0;
    let packageName: string | null = null;

    const isPerQuantity = item.section_pricing_type === "per_quantity";
    if (isPerQuantity) {
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0 || isNaN(qty)) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "الكمية المطلوبة غير صالحة" });
        return;
      }
      const unitPrice = parseFloat(item.price_per_unit);
      if (!unitPrice || isNaN(unitPrice)) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "سعر الوحدة غير محدد لهذا المنتج" });
        return;
      }
      priceUsd = unitPrice * qty;
      packageName = `${qty} ${item.currency_unit ?? "وحدة"}`;
    } else {
      const pkgIdNum = parseInt(packageId, 10);
      if (!pkgIdNum || isNaN(pkgIdNum)) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "الرجاء اختيار باقة" });
        return;
      }
      const pkgRes = await client.query(
        `SELECT id, label, price_usd FROM packages WHERE id=$1 AND item_id=$2`,
        [pkgIdNum, itemIdNum]
      );
      if (pkgRes.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "الباقة غير موجودة" });
        return;
      }
      const pkg = pkgRes.rows[0];
      priceUsd = parseFloat(pkg.price_usd);
      packageName = pkg.label;
    }

    if (!priceUsd || priceUsd <= 0 || isNaN(priceUsd)) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "سعر غير صالح" });
      return;
    }

    // Convert USD → user's currency using currencies table
    const userCurrency = (user.currency || "USD").toUpperCase();
    const currenciesRes = await client.query("SELECT code, usd_rate FROM currencies");
    const rates: Record<string, number> = { USD: 1 };
    for (const row of currenciesRes.rows) rates[row.code] = parseFloat(row.usd_rate);
    const rate = rates[userCurrency];
    if (!rate || isNaN(rate)) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: `سعر الصرف غير محدد لعملة ${userCurrency}. يرجى التواصل مع الإدارة.` });
      return;
    }
    const isHighUnit = ["SYP", "DZD", "IQD"].includes(userCurrency);
    const cost = +(priceUsd * rate).toFixed(isHighUnit ? 0 : userCurrency === "OMR" ? 3 : 2);

    // Lock balance + check
    const u = await client.query("SELECT balance FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    if (u.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const currentBalance = parseFloat(u.rows[0].balance);
    if (currentBalance < cost) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: "رصيدك غير كافٍ، الرجاء شحن حسابك أولاً",
        code: "INSUFFICIENT_BALANCE",
        required: cost,
        currency: userCurrency,
        balance: currentBalance,
      });
      return;
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, item_name, package_name, target_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [user.id, item.name_ar, packageName, targetId || null, cost, userCurrency]
    );
    const order = orderRes.rows[0];

    await client.query(
      `UPDATE users SET balance = balance - $1, updated_at=NOW() WHERE id=$2`,
      [cost, user.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'purchase', $2, $3, $4)`,
      [user.id, cost, `شراء ${item.name_ar}${packageName ? " - " + packageName : ""}`, order.id]
    );

    await client.query("COMMIT");

    // Auto-charge via API if configured
    let finalStatus = order.status as string;
    let autoCharged = false;
    const apiEndpoint = item.api_endpoint as string | null;
    const apiKey = item.api_key as string | null;
    const apiAgentId = item.api_agent_id as string | null;

    if (apiEndpoint && apiKey) {
      try {
        const apiRes = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            agent_id: apiAgentId || undefined,
            order_id: order.id,
            item_name: item.name_ar,
            package_name: packageName,
            target_id: targetId || null,
            quantity: isPerQuantity ? parseFloat(quantity) : undefined,
            amount_usd: priceUsd,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const apiData = await apiRes.json().catch(() => ({})) as Record<string, unknown>;
        if (apiRes.ok && apiData?.["success"]) {
          finalStatus = "completed";
          autoCharged = true;
          await pool.query(
            `UPDATE orders SET status='completed', notes=$1 WHERE id=$2`,
            [`تم الشحن تلقائياً - معرف العملية: ${String(apiData?.["transaction_id"] ?? "N/A")}`, order.id]
          );
        } else {
          finalStatus = "pending";
          await pool.query(
            `UPDATE orders SET notes=$1 WHERE id=$2`,
            [`فشل الشحن التلقائي: ${String(apiData?.["error"] ?? "خطأ غير معروف")} - سيتم المعالجة يدوياً`, order.id]
          );
        }
      } catch (apiErr: any) {
        finalStatus = "pending";
        await pool.query(
          `UPDATE orders SET notes=$1 WHERE id=$2`,
          [`فشل الاتصال بـ API: ${apiErr?.message ?? "timeout"} - سيتم المعالجة يدوياً`, order.id]
        ).catch(() => {});
      }
    }

    // Notify admins of the new order (fire-and-forget)
    const userLabel = user.name || user.email || `#${user.accountNumber ?? user.id}`;
    const orderLabel = `${item.name_ar}${packageName ? " - " + packageName : ""}`;
    const adminTitle = autoCharged ? "✅ شحن تلقائي ناجح" : "🛒 طلب شحن جديد";
    const adminBody = `${userLabel} - ${orderLabel} بقيمة ${cost} ${userCurrency}${targetId ? ` · ID: ${targetId}` : ""}${autoCharged ? " · تم تلقائياً" : ""}`;
    sendPushToAdmins(adminTitle, adminBody, "/admin").catch(() => {});

    res.json({
      success: true,
      autoCharged,
      order: {
        id: order.id,
        itemName: order.item_name,
        packageName: order.package_name,
        targetId: order.target_id,
        amount: parseFloat(order.amount),
        currency: order.currency,
        status: finalStatus,
        createdAt: order.created_at,
      },
      newBalance: currentBalance - cost,
    });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "خطأ في إنشاء الطلب: " + err.message });
  } finally {
    client.release();
  }
});

router.get("/orders", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  const { from, to } = req.query;
  try {
    let q = "SELECT * FROM orders WHERE user_id=$1";
    const params: any[] = [user.id];
    if (from) { params.push(from); q += ` AND created_at >= $${params.length}`; }
    if (to) { params.push(to); q += ` AND created_at <= $${params.length}`; }
    q += " ORDER BY created_at DESC";
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id,
      itemName: r.item_name,
      packageName: r.package_name,
      targetId: r.target_id,
      amount: parseFloat(r.amount),
      currency: r.currency,
      status: r.status,
      createdAt: r.created_at,
    })));
  } catch {
    res.status(500).json({ error: "خطأ في جلب الطلبات" });
  }
});

export default router;
