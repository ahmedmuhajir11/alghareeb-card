import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { sendPushToUser, sendPushToAdmins } from "./push";
import { extractProviderUsername } from "../lib/order-status";

const router: IRouter = Router();

// ── YazanCard Callback / Webhook Endpoint ──────────────────────────────────────
// Supports both POST and GET, on both /webhooks/yazancard and /yazan-callback
const handleYazanCallback = async (req: Request, res: Response): Promise<void> => {
  const payload: Record<string, any> = { ...req.query, ...(req.body || {}) };
  console.log("📥 YazanCard Webhook received:", JSON.stringify(payload));

  const rawStatus = String(
    payload.status || payload.state || payload.order_status ||
    (payload.data && payload.data.status) || ""
  ).toLowerCase().trim();

  let providerOrderId =
    payload.order_id ||
    payload.orderId ||
    payload.id ||
    (payload.data && (payload.data.order_id || payload.data.id || payload.data.transaction_id)) ||
    payload.transaction_id ||
    payload.tx_id;

  const orderUuid =
    payload.order_uuid ||
    payload.orderUuid ||
    payload.uuid ||
    (payload.data && (payload.data.order_uuid || payload.data.uuid));

  if (!providerOrderId && payload.orders) {
    if (Array.isArray(payload.orders) && payload.orders.length > 0) {
      providerOrderId = payload.orders[0]?.order_id || payload.orders[0]?.id;
    } else if (typeof payload.orders === "object") {
      const firstKey = Object.keys(payload.orders)[0];
      providerOrderId = firstKey;
    }
  }

  const receiptLink =
    payload.receipt ||
    payload.image ||
    payload.img ||
    payload.file ||
    payload.url ||
    (payload.data && (payload.data.receipt || payload.data.image || payload.data.img || payload.data.file || payload.data.url));

  const reason = String(payload.msg || payload.message || payload.reason || payload.error || "تحديث من المزود");

  if (!orderUuid && !providerOrderId) {
    res.status(400).json({ error: "Missing order_uuid or order_id in callback payload", received: payload });
    return;
  }

  const client = await pool.connect();
  try {
    // ⚠️ BEGIN MUST come before FOR UPDATE — PostgreSQL requires an explicit
    // transaction for row-level locking. This also prevents double-refund race
    // conditions when two webhooks arrive simultaneously for the same order.
    await client.query("BEGIN");

    // 1. Locate the order (with row lock to serialize concurrent callbacks)
    let order: any = null;

    if (orderUuid) {
      const r = await client.query(
        "SELECT * FROM orders WHERE notes LIKE $1 ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [`%[uuid:${orderUuid}]%`]
      );
      if (r.rows.length > 0) order = r.rows[0];
    }

    if (!order && providerOrderId) {
      const pid = String(providerOrderId).trim();
      const cleanPid = pid.replace(/^ID_/i, "").trim();

      // Match order by notes containing pid, ID_cleanPid, cleanPid, or matching order.id
      const r = await client.query(
        `SELECT * FROM orders
         WHERE notes LIKE $1
            OR notes LIKE $2
            OR notes LIKE $3
            OR id::text = $4
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [`%${pid}%`, `%ID_${cleanPid}%`, `%${cleanPid}%`, pid]
      );
      if (r.rows.length > 0) order = r.rows[0];
    }

    if (!order) {
      await client.query("ROLLBACK");
      console.warn("⚠️ Webhook: Order not found for payload:", payload);
      res.status(404).json({ error: "الطلب غير موجود في النظام", received: payload });
      return;
    }

    // If order is already completed or rejected, do not double-process
    if (order.status !== "pending") {
      await client.query("ROLLBACK");
      res.json({
        success: true,
        message: `الطلب رقم ${order.id} تمت معالجته مسبقاً بحالة (${order.status})`,
        status: order.status,
      });
      return;
    }

    const cost = parseFloat(order.amount);

    const rawStatusLower = rawStatus.toLowerCase();
    const reasonLower = reason.toLowerCase();
    const noteLower = String(payload.note || payload.data?.note || "").toLowerCase();

    // 2. Handle Statuses:
    const isSuccess =
      rawStatusLower === "accept" ||
      rawStatusLower === "accepted" ||
      rawStatusLower === "success" ||
      rawStatusLower === "completed" ||
      rawStatusLower === "approved" ||
      rawStatusLower === "ok" ||
      rawStatusLower === "done" ||
      rawStatusLower === "مقبول" ||
      rawStatusLower === "مكتمل" ||
      payload.success === true ||
      payload.status === 1 ||
      payload.status === "1" ||
      payload.code === 1 ||
      payload.code === "1" ||
      payload.result === "success" ||
      payload.result === "ok";

    const isFailure =
      rawStatusLower === "failed" ||
      rawStatusLower === "fail" ||
      rawStatusLower === "reject" ||
      rawStatusLower === "rejected" ||
      rawStatusLower === "refuse" ||
      rawStatusLower === "refused" ||
      rawStatusLower === "error" ||
      rawStatusLower === "cancelled" ||
      rawStatusLower === "canceled" ||
      rawStatusLower === "cancel" ||
      rawStatusLower === "مرفوض" ||
      rawStatusLower === "ملغى" ||
      rawStatusLower.includes("not found") ||
      rawStatusLower.includes("user not found") ||
      rawStatusLower.includes("غير موجود") ||
      reasonLower.includes("not found") ||
      reasonLower.includes("user not found") ||
      reasonLower.includes("غير موجود") ||
      reasonLower.includes("error") ||
      reasonLower.includes("failed") ||
      reasonLower.includes("reject") ||
      reasonLower.includes("refuse") ||
      reasonLower.includes("مرفوض") ||
      noteLower.includes("not found") ||
      noteLower.includes("user not found") ||
      noteLower.includes("غير موجود") ||
      payload.success === false ||
      payload.status === 0 ||
      payload.status === "0" ||
      payload.code === 0 ||
      payload.code === "0" ||
      payload.result === "fail" ||
      payload.result === "failed" ||
      payload.result === "error";

    if (isSuccess) {
      const receiptSuffix = receiptLink ? ` | ${receiptLink}` : "";
      const providerUsername = extractProviderUsername(payload.data) ?? extractProviderUsername(payload);
      await client.query(
        `UPDATE orders SET status='completed', provider_username = COALESCE($1, provider_username), notes = COALESCE(notes, '') || $2, updated_at=NOW() WHERE id=$3`,
        [providerUsername, ` | تأكيد عبر Callback ✅${receiptSuffix}`, order.id]
      );
      await client.query("COMMIT");

      sendPushToUser(
        order.user_id,
        "✅ تمت عملية الشحن بنجاح",
        `تم شحن ${order.item_name}${order.package_name ? " - " + order.package_name : ""} بنجاح. شكراً لثقتك بالغريب كارد.`,
        "/orders"
      ).catch(() => {});

      sendPushToAdmins(
        "✅ اكتمل الشحن التلقائي (إشعار المزود)",
        `رقم الطلب: #${order.id}\nالتطبيق/المنتج: ${order.item_name}${order.package_name ? " - " + order.package_name : ""}\nمعرّف الحساب (ID): ${order.target_id || "—"}\nالسعر: ${order.amount} ${order.currency}`,
        "/admin"
      ).catch(() => {});

      res.json({ success: true, message: "Order marked as completed", orderId: order.id });
      return;
    }

    if (isFailure) {
      // ── AUTO-REFUND: idempotency check prevents double-refund if webhook fires twice ──
      // The order row is locked via FOR UPDATE above, so concurrent webhooks are serialized.
      const refTx = await client.query(
        "SELECT id FROM wallet_transactions WHERE user_id=$1 AND type='refund' AND ref_id=$2 LIMIT 1",
        [order.user_id, order.id]
      );

      let refunded = false;
      if (refTx.rows.length === 0) {
        // 1. Return held balance to customer wallet
        await client.query(
          `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2`,
          [cost, order.user_id]
        );
        // 2. Record refund transaction for audit trail
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id)
           VALUES ($1, 'refund', $2, $3, $4)`,
          [
            order.user_id,
            cost,
            `استرجاع رصيد تلقائي (Callback) - رفض طلب ${order.item_name}: ${reason}`,
            order.id,
          ]
        );
        refunded = true;
        console.log(`✅ Refund issued: order #${order.id}, amount=${cost} ${order.currency}, user=${order.user_id}`);
      } else {
        console.log(`ℹ️ Refund already processed for order #${order.id} — skipping duplicate webhook`);
      }

      // 3. Update order status to FAILED/rejected with reason
      await client.query(
        `UPDATE orders SET status='rejected',
          notes = COALESCE(notes, '') || $1,
          updated_at = NOW()
         WHERE id = $2`,
        [
          ` | مرفوض عبر Callback ❌: ${reason}${refunded ? ` | تم استرجاع ${cost} ${order.currency}` : " | الرصيد مُسترجع مسبقاً"}`,
          order.id,
        ]
      );
      await client.query("COMMIT");

      // Push notifications (fire-and-forget)
      if (refunded) {
        sendPushToUser(
          order.user_id,
          "❌ تعذّر تنفيذ طلب الشحن",
          `تعذّر تنفيذ طلب ${order.item_name}. تمت إعادة ${cost} ${order.currency} إلى محفظتك تلقائياً.`,
          "/orders"
        ).catch(() => {});

        sendPushToAdmins(
          "❌ فشل شحن تلقائي وتم استرجاع الرصيد (إشعار المزود)",
          `رقم الطلب: #${order.id}\nالتطبيق/المنتج: ${order.item_name}${order.package_name ? " - " + order.package_name : ""}\nمعرّف الحساب (ID): ${order.target_id || "—"}\nالسبب: ${reason}\nتمت إعادة ${cost} ${order.currency} إلى رصيد العميل تلقائياً.`,
          "/admin"
        ).catch(() => {});
      }

      res.json({
        success: true,
        message: refunded ? "Order rejected and balance auto-refunded" : "Order already refunded — duplicate webhook ignored",
        orderId: order.id,
        refunded,
      });
      return;
    }

    // If wait or unrecognized status
    await client.query(
      `UPDATE orders SET notes = COALESCE(notes, '') || $1, updated_at=NOW() WHERE id=$2`,
      [` | إشعار انتظار Callback: ${rawStatus || reason}`, order.id]
    );
    await client.query("COMMIT");

    res.json({ success: true, message: `Status noted: ${rawStatus}`, orderId: order.id });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Error in YazanCard callback handler:", err);
    res.status(500).json({ error: "Internal error processing callback: " + err.message });
  } finally {
    client.release();
  }
};

router.all("/webhooks/yazancard", handleYazanCallback);
router.all("/yazan-callback", handleYazanCallback);
router.all("/callback", handleYazanCallback);
router.all("/api/callback", handleYazanCallback);
router.all("/client/callback", handleYazanCallback);

export default router;
