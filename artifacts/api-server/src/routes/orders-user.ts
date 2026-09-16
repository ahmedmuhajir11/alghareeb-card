import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";
import { sendPushToAdmins, sendPushToUser } from "./push";
import { extractProviderUsername } from "../lib/order-status";

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
      `SELECT i.id, i.name_ar, i.name_en, i.name_tr, i.section_id, i.price_per_unit, i.currency_unit,
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
      // Check for user-specific custom price
      const customPriceRes = await client.query(
        `SELECT price_per_unit FROM user_item_prices WHERE account_number = $1 AND item_id = $2`,
        [user.account_number, itemIdNum]
      );
      const unitPrice = customPriceRes.rows.length > 0
        ? parseFloat(customPriceRes.rows[0].price_per_unit)
        : parseFloat(item.price_per_unit);
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
        `SELECT id, label, price_usd, quantity, api_endpoint, api_key FROM packages WHERE id=$1 AND item_id=$2`,
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
      // If item has no API credentials, fall back to package-level credentials (grouped import mode)
      if ((!item.api_endpoint || !item.api_key) && pkg.api_endpoint && pkg.api_key) {
        item.api_endpoint = pkg.api_endpoint;
        item.api_key = pkg.api_key;
      }
      // Store package quantity for use in API call (YazanCard "amount" products need actual qty)
      item._pkgQuantity = pkg.quantity ? Number(pkg.quantity) : null;
    }

    if (!priceUsd || priceUsd <= 0 || isNaN(priceUsd)) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "سعر غير صالح" });
      return;
    }

    // Convert USD → user's currency using currencies table (single source of truth)
    const userCurrency = (user.currency || "USD").toUpperCase();
    const currRows = await client.query("SELECT code, usd_rate FROM currencies WHERE is_active = true");
    const rateMap: Record<string, number> = { USD: 1 };
    for (const r of currRows.rows) {
      const v = parseFloat(r.usd_rate);
      if (v > 0) rateMap[r.code.toUpperCase()] = v;
    }
    const rate = rateMap[userCurrency];
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

    // Create order in pending state
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, item_name, item_name_en, item_name_tr, package_name, package_id, target_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
      [user.id, item.name_ar, item.name_en || null, item.name_tr || null, packageName, packageId ? parseInt(packageId, 10) : null, targetId || null, cost, userCurrency]
    );
    const order = orderRes.rows[0];

    // Hold/Deduct balance immediately upon creating order (prevents double-spending)
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
    let providerUsername: string | null = null;
    const apiEndpoint = item.api_endpoint as string | null;
    const apiKey = item.api_key as string | null;
    const orderUuid = crypto.randomUUID();

    if (apiEndpoint && apiKey) {
      try {
        const isYazanCard = apiEndpoint.includes("yazancard.com") || apiEndpoint.includes("/client/api/");

        let apiRes: Response;
        if (isYazanCard) {
          // yazancard.com: GET /newOrder/{id}/params?qty=...&playerId=...
          // Auth header: api-token (per official docs)
          const cleanKey = apiKey.trim();
          const chargeEndpoint = apiEndpoint.replace(/\/params\/?$/, "") + "/params";
          // For "amount" products, use package quantity; for per-quantity items use quantity
          const apiQty = isPerQuantity
            ? parseFloat(quantity)
            : (item._pkgQuantity && item._pkgQuantity > 1 ? item._pkgQuantity : 1);
          const url = new URL(chargeEndpoint);
          url.searchParams.set("qty", String(apiQty));
          url.searchParams.set("order_uuid", orderUuid);
          // Map player_id → playerId (YazanCard field name). Send once only.
          if (targetId) {
            url.searchParams.set("playerId", String(targetId));
          }



          apiRes = await fetch(url.toString(), {
            method: "GET",
            headers: { "api-token": cleanKey },
            signal: AbortSignal.timeout(20000),
          });
        } else {
          // Generic format: POST with JSON body
          apiRes = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: apiKey,
              order_id: order.id,
              order_uuid: orderUuid,
              item_name: item.name_ar,
              package_name: packageName,
              target_id: targetId || null,
              quantity: isPerQuantity ? parseFloat(quantity) : undefined,
              amount_usd: priceUsd,
            }),
            signal: AbortSignal.timeout(15000),
          });
        }

        // Safe JSON parse — HTML responses (IP block etc) return {}
        const rawText = await apiRes.text().catch(() => "");
        let apiData: Record<string, unknown> = {};
        try { apiData = JSON.parse(rawText); } catch { /* HTML or non-JSON */ }

        // YazanCard response shape: { status: "OK", data: { status: "accept"|"wait", order_id: "..." } }
        const isYazanResp = typeof apiData?.["status"] === "string";
        const yzStatus = isYazanResp ? String(apiData["status"]) : "";
        const yzDataStatus = (apiData?.["data"] as any)?.["status"] ?? "";
        const yazanAccepted = yzStatus === "OK" && yzDataStatus === "accept";
        const yazanWait = yzStatus === "OK" && yzDataStatus === "wait";

        // Generic success check (non-YazanCard APIs)
        const explicitFailure =
          apiData?.["success"] === false ||
          yzStatus === "ERROR" || yzStatus === "FAILED" || yzStatus === "error" ||
          apiData?.["status"] === "failed" ||
          apiData?.["code"] === 0;
        const genericSuccess = apiRes.ok && !isYazanResp && !explicitFailure;

        if (yazanAccepted || genericSuccess) {
          // Provider accepted → order completed (balance was already held)
          finalStatus = "completed";
          autoCharged = true;
          const yzOrderId = (apiData?.["data"] as any)?.["order_id"] ?? null;
          const txId = String(yzOrderId ?? apiData?.["order_id"] ?? apiData?.["transaction_id"] ?? apiData?.["id"] ?? "N/A");
          providerUsername = extractProviderUsername(apiData?.["data"]) ?? extractProviderUsername(apiData);
          await pool.query(
            `UPDATE orders SET status='completed', provider_username=$1, notes=$2, updated_at=NOW() WHERE id=$3`,
            [providerUsername, `تم الشحن تلقائياً ✅ - معرف العملية: ${txId} [uuid:${orderUuid}]`, order.id]
          );
        } else if (yazanWait) {
          const yzOrderId = (apiData?.["data"] as any)?.["order_id"] ?? null;
          const txId = String(yzOrderId ?? "N/A");
          let resolvedDirectly = false;

          if (txId !== "N/A" && apiKey) {
            try {
              // Wait 2.5 seconds to catch fast completions/rejections (e.g. User Not Found)
              await new Promise((r) => setTimeout(r, 2500));

              const cleanKey = apiKey.trim();
              let baseUrl = "https://api.yazancard.com/client/api";
              if (apiEndpoint) {
                baseUrl = apiEndpoint.replace(/\/newOrder\/.*$/, "").replace(/\/+$/, "");
                if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
              }
              const cleanTxId = txId.replace(/^ID_/i, "");
              const checkUrl = `${baseUrl}/check?orders=${encodeURIComponent(txId)}`;

              let chkRes = await fetch(checkUrl, {
                headers: { "api-token": cleanKey },
                signal: AbortSignal.timeout(6000),
              });

              // Fallback without ID_ prefix if needed
              if (!chkRes.ok && cleanTxId && cleanTxId !== txId) {
                const altRes = await fetch(`${baseUrl}/check?orders=${encodeURIComponent(cleanTxId)}`, {
                  headers: { "api-token": cleanKey },
                  signal: AbortSignal.timeout(6000),
                });
                if (altRes.ok) chkRes = altRes;
              }

              if (chkRes.ok) {
                const chkText = await chkRes.text().catch(() => "");
                let chkData: any = {};
                try { chkData = JSON.parse(chkText); } catch {}

                let orderChk: any = null;
                if (Array.isArray(chkData.data)) {
                  orderChk = chkData.data[0];
                } else if (chkData.data && typeof chkData.data === "object") {
                  orderChk = chkData.data[txId] || chkData.data[cleanTxId] || chkData.data[Object.keys(chkData.data)[0]];
                } else if (chkData.orders) {
                  orderChk = Array.isArray(chkData.orders) ? chkData.orders[0] : chkData.orders[txId] || chkData.orders[cleanTxId];
                }

                if (orderChk && typeof orderChk === "object") {
                  const s = String(orderChk.status || orderChk.state || orderChk.order_status || "").toLowerCase().trim();
                  const note = String(orderChk.note || orderChk.msg || orderChk.message || orderChk.error || "");
                  const noteLower = note.toLowerCase();

                  const isAccepted =
                    s === "accept" || s === "accepted" || s === "completed" || s === "success" ||
                    s === "approved" || s === "done" || s === "ok" || s === "مقبول" || s === "مكتمل" || s === "تم";

                  const isRejected =
                    s === "reject" || s === "rejected" || s === "refuse" || s === "refused" ||
                    s === "failed" || s === "fail" || s === "error" || s === "مرفوض" || s === "ملغى" ||
                    s.includes("not found") || s.includes("user not found") ||
                    noteLower.includes("user not found") || noteLower.includes("not found") ||
                    note.includes("غير موجود") || note.includes("مرفوض");

                  if (isAccepted) {
                    finalStatus = "completed";
                    autoCharged = true;
                    resolvedDirectly = true;
                    providerUsername = extractProviderUsername(orderChk);
                    const receiptSuffix = (orderChk.receipt || orderChk.image || orderChk.url) ? ` | ${orderChk.receipt || orderChk.image || orderChk.url}` : "";
                    await pool.query(
                      `UPDATE orders SET status='completed', provider_username=$1, notes=$2, updated_at=NOW() WHERE id=$3`,
                      [providerUsername, `تم الشحن تلقائياً ✅ - معرف العملية: ${txId}${receiptSuffix} [uuid:${orderUuid}]`, order.id]
                    );
                  } else if (isRejected) {
                    finalStatus = "rejected";
                    resolvedDirectly = true;
                    const rejReason = note || s || "رفض من المزود";
                    await pool.query(
                      `UPDATE orders SET status='rejected', notes=$1, updated_at=NOW() WHERE id=$2`,
                      [`فشل الشحن وتم استرجاع الرصيد تلقائياً ❌ (${rejReason}) - معرف العملية: ${txId} [uuid:${orderUuid}]`, order.id]
                    );
                    await pool.query(
                      `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2`,
                      [cost, user.id]
                    );
                    await pool.query(
                      `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'refund', $2, $3, $4)`,
                      [user.id, cost, `استرجاع رصيد تلقائي - رفض طلب ${item.name_ar} (${rejReason})`, order.id]
                    );
                  }
                }
              }
            } catch (quickErr: any) {
              console.warn("[OrdersUser] Quick check non-fatal error:", quickErr?.message);
            }
          }

          if (!resolvedDirectly) {
            finalStatus = "pending";
            await pool.query(
              `UPDATE orders SET notes=$1, updated_at=NOW() WHERE id=$2`,
              [`بانتظار تأكيد YazanCard ⏳ - معرف العملية: ${txId} [uuid:${orderUuid}]`, order.id]
            );
          }
        } else {
          // Explicit rejection/failure → mark rejected AND AUTO-REFUND to wallet
          finalStatus = "rejected";
          const errMsg = String(
            apiData?.["msg"] ?? apiData?.["error"] ?? apiData?.["message"] ??
            (apiData?.["data"] as any)?.["note"] ?? (apiData?.["data"] as any)?.["msg"] ?? (apiData?.["data"] as any)?.["error"] ??
            (rawText.includes("<!DOCTYPE") ? "IP محظور أو خطأ في الخادم" : "رفض من المزود")
          );
          const rawResp = rawText.slice(0, 150);
          await pool.query(
            `UPDATE orders SET status='rejected', notes=$1, updated_at=NOW() WHERE id=$2`,
            [`فشل الشحن وتم استرجاع الرصيد تلقائياً: ${errMsg} | رد: ${rawResp} [uuid:${orderUuid}]`, order.id]
          );

          // Return held money to user wallet
          await pool.query(
            `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2`,
            [cost, user.id]
          );
          await pool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'refund', $2, $3, $4)`,
            [user.id, cost, `استرجاع رصيد تلقائي - فشل شحن ${item.name_ar}: ${errMsg}`, order.id]
          );
        }
      } catch (apiErr: any) {
        // Timeout or connection error → keep pending with held balance for safety
        finalStatus = "pending";
        await pool.query(
          `UPDATE orders SET notes=$1, updated_at=NOW() WHERE id=$2`,
          [`فشل الاتصال بـ API: ${apiErr?.message ?? "timeout"} — معلق بانتظار المراجعة أو الفحص [uuid:${orderUuid}]`, order.id]
        ).catch(() => {});
      }
    }

    // Push notification to user on outcome
    if (finalStatus === "rejected") {
      sendPushToUser(
        user.id,
        "❌ فشل الشحن وتم استرجاع الرصيد",
        `تعذر تنفيذ طلب ${item.name_ar} وتمت إعادة ${cost} ${userCurrency} إلى محفظتك تلقائياً.`,
        "/orders"
      ).catch(() => {});
    } else if (finalStatus === "completed") {
      sendPushToUser(
        user.id,
        "✅ تم تنفيذ طلب الشحن بنجاح",
        `تم شحن ${item.name_ar}${packageName ? " - " + packageName : ""} بنجاح. شكراً لك!`,
        "/orders"
      ).catch(() => {});
    }

    // Notify admins of the new order (fire-and-forget)
    const userLabel = user.name || user.email || `#${user.accountNumber ?? user.id}`;
    const orderLabel = `${item.name_ar}${packageName ? " - " + packageName : ""}`;
    const adminTitle = autoCharged
      ? "✅ شحن تلقائي ناجح"
      : finalStatus === "rejected"
      ? "❌ طلب مرفوض (تم استرجاع الرصيد آلياً)"
      : "🛒 طلب شحن جديد";
    const adminBody = `${userLabel} - ${orderLabel} بقيمة ${cost} ${userCurrency}${targetId ? ` · ID: ${targetId}` : ""}${autoCharged ? " · تم تلقائياً" : ""}`;
    sendPushToAdmins(adminTitle, adminBody, "/admin").catch(() => {});

    const userBalanceAfter = finalStatus === "rejected" ? currentBalance : (currentBalance - cost);

    res.json({
      success: true,
      autoCharged,
      order: {
        id: order.id,
        itemName: order.item_name,
        itemNameEn: order.item_name_en || null,
        packageName: order.package_name,
        targetId: order.target_id,
        providerUsername: providerUsername,
        amount: parseFloat(order.amount),
        currency: order.currency,
        status: finalStatus,
        createdAt: order.created_at,
      },
      newBalance: userBalanceAfter,
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
      itemNameEn: r.item_name_en || null,
      itemNameTr: r.item_name_tr || null,
      packageName: r.package_name,
      targetId: r.target_id,
      providerUsername: r.provider_username || null,
      amount: parseFloat(r.amount),
      currency: r.currency,
      status: r.status,
      notes: r.notes || null,
      createdAt: r.created_at,
    })));
  } catch {
    res.status(500).json({ error: "خطأ في جلب الطلبات" });
  }
});

export default router;
