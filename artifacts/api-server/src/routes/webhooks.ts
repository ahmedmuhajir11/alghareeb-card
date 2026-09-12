import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { sendPushToUser, sendPushToAdmins } from "./push";

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

  const providerOrderId = payload.order_id || payload.orderId || payload.id || (payload.data && payload.data.order_id);
  const orderUuid = payload.order_uuid || payload.orderUuid || payload.uuid;
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
      // Check if providerOrderId matches our order ID directly
      const numId = parseInt(String(providerOrderId), 10);
      if (!isNaN(numId)) {
        const r = await client.query("SELECT * FROM orders WHERE id = $1 LIMIT 1 FOR UPDATE", [numId]);
        if (r.rows.length > 0) order = r.rows[0];
      }
      // Or check if providerOrderId is recorded in notes
      if (!order) {
        const r = await client.query(
          "SELECT * FROM orders WHERE notes LIKE $1 ORDER BY id DESC LIMIT 1 FOR UPDATE",
          [`%معرف العملية: ${providerOrderId}%`]
        );
        if (r.rows.length > 0) order = r.rows[0];
      }
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

    // 2. Handle Statuses:
    const isSuccess =
      rawStatus === "accept" ||
      rawStatus === "success" ||
      rawStatus === "completed" ||
      rawStatus === "approved" ||
      rawStatus === "ok";

    const isFailure =
      rawStatus === "failed" ||
      rawStatus === "fail" ||
      rawStatus === "reject" ||
      rawStatus === "rejected" ||
      rawStatus === "error" ||
      rawStatus === "cancelled" ||
      rawStatus === "canceled" ||
      rawStatus === "cancel";

    if (isSuccess) {
      await client.query(
        `UPDATE orders SET status='completed', notes = COALESCE(notes, '') || ' | تأكيد عبر Callback ✅', updated_at=NOW() WHERE id=$1`,
        [order.id]
      );
      await client.query("COMMIT");

      sendPushToUser(
        order.user_id,
        "✅ تم تنفيذ طلب الشحن",
        `تم شحن ${order.item_name}${order.package_name ? " - " + order.package_name : ""} بنجاح.`,
        "/orders"
      ).catch(() => {});

      sendPushToAdmins(
        "✅ اكتمال شحن تلقائي (Callback)",
        `تم تأكيد الطلب #${order.id} بنجاح من المزود.`,
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
          "❌ فشل الشحن وتم استرجاع الرصيد",
          `تعذر تنفيذ طلب ${order.item_name} وتمت إعادة ${cost} ${order.currency} إلى محفظتك تلقائياً.`,
          "/orders"
        ).catch(() => {});

        sendPushToAdmins(
          "❌ رفض طلب شحن تلقائياً (Callback)",
          `تم رفض الطلب #${order.id} من المزود (${reason}) وتم استرجاع ${cost} ${order.currency} للعميل آلياً.`,
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

export default router;
