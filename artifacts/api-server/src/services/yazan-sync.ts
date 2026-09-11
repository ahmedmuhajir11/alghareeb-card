import { pool } from "@workspace/db";
import { sendPushToUser, sendPushToAdmins } from "../routes/push";

/**
 * Parses any response structure from YazanCard / Syria4Game /check endpoint
 */
function parseCheckStatus(checkData: any, providerOrderId: string): { status: string; note: string } | null {
  if (!checkData) return null;

  let orderInfo: any = null;

  if (Array.isArray(checkData.data)) {
    orderInfo = checkData.data.find((o: any) => {
      const oid = String(o.order_id || o.id || "");
      return oid && (oid.includes(providerOrderId) || providerOrderId.includes(oid));
    }) || checkData.data[0];
  } else if (checkData.data && typeof checkData.data === "object") {
    if (checkData.data[providerOrderId]) {
      orderInfo = checkData.data[providerOrderId];
    } else {
      const keys = Object.keys(checkData.data);
      if (keys.length > 0) orderInfo = checkData.data[keys[0]];
    }
  } else if (checkData.orders) {
    if (Array.isArray(checkData.orders)) {
      orderInfo = checkData.orders[0];
    } else if (typeof checkData.orders === "object") {
      orderInfo = checkData.orders[providerOrderId] || Object.values(checkData.orders)[0];
    }
  } else if (checkData.status) {
    orderInfo = checkData;
  }

  if (!orderInfo) return null;

  const rawStatus = String(
    orderInfo.status || orderInfo.state || orderInfo.order_status || ""
  ).toLowerCase().trim();

  const note = String(orderInfo.note || orderInfo.msg || orderInfo.message || orderInfo.error || "");

  return { status: rawStatus, note };
}

/**
 * Checks all pending orders with YazanCard/provider API and auto-updates & refunds on rejection
 */
export async function syncPendingYazanOrders(): Promise<{ checked: number; updated: number; results: any[] }> {
  const results: any[] = [];
  let updatedCount = 0;

  try {
    // Find all pending orders created in the last 7 days that have a provider order ID or API note
    const pendingOrdersRes = await pool.query(
      `SELECT o.*,
              i.api_endpoint AS item_ep, i.api_key AS item_key,
              p.api_endpoint AS pkg_ep, p.api_key AS pkg_key
       FROM orders o
       LEFT JOIN items i ON i.name_ar = o.item_name
       LEFT JOIN packages p ON p.label = o.package_name AND p.item_id = i.id
       WHERE o.status = 'pending'
         AND o.notes LIKE '%معرف العملية:%'
         AND o.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY o.id ASC`
    );

    const orders = pendingOrdersRes.rows;
    if (orders.length === 0) {
      return { checked: 0, updated: 0, results: [] };
    }

    for (const order of orders) {
      const match = String(order.notes || "").match(/معرف العملية:\s*([^\s\[]+)/);
      const providerOrderId = match ? match[1].trim() : null;

      if (!providerOrderId || providerOrderId === "N/A") {
        continue;
      }

      // Resolve endpoint and key
      const apiEndpoint: string = order.pkg_ep || order.item_ep || "";
      const apiKey: string = (order.pkg_key || order.item_key || process.env.YAZANCARD_TOKEN || "").trim();

      const isYazan = apiEndpoint.includes("yazancard.com") || apiEndpoint.includes("/client/api/") || Boolean(process.env.YAZANCARD_TOKEN);

      if (!isYazan || !apiKey) {
        continue;
      }

      let baseUrl = "https://api.yazancard.com/client/api";
      if (apiEndpoint) {
        baseUrl = apiEndpoint.replace(/\/newOrder\/.*$/, "").replace(/\/+$/, "");
        if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
      }

      try {
        const checkUrl = `${baseUrl}/check?orders=${encodeURIComponent(providerOrderId)}`;
        const apiRes = await fetch(checkUrl, {
          headers: {
            "api-token": apiKey,
            "Api-Token": apiKey,
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!apiRes.ok) {
          continue;
        }

        const rawText = await apiRes.text().catch(() => "");
        let apiData: any = {};
        try { apiData = JSON.parse(rawText); } catch { continue; }

        const parsed = parseCheckStatus(apiData, providerOrderId);
        if (!parsed) {
          continue;
        }

        const { status: rawStatus, note } = parsed;

        const isSuccess =
          rawStatus === "accept" ||
          rawStatus === "completed" ||
          rawStatus === "success" ||
          rawStatus === "approved" ||
          rawStatus === "done" ||
          rawStatus === "مكتمل" ||
          rawStatus === "مقبول";

        const isFailure =
          rawStatus === "refused" ||
          rawStatus === "rejected" ||
          rawStatus === "failed" ||
          rawStatus === "canceled" ||
          rawStatus === "cancelled" ||
          rawStatus === "error" ||
          rawStatus === "مرفوض" ||
          rawStatus === "ملغى" ||
          note.toLowerCase().includes("user not found") ||
          note.toLowerCase().includes("not found") ||
          note.includes("غير موجود");

        if (isSuccess) {
          await pool.query(
            `UPDATE orders SET status='completed', notes = notes || ' | تأكيد عبر المزامنة الآلية ✅', updated_at=NOW() WHERE id=$1 AND status='pending'`,
            [order.id]
          );
          sendPushToUser(
            order.user_id,
            "✅ تم تنفيذ طلب الشحن",
            `تم شحن ${order.item_name} بنجاح. شكراً لك!`,
            "/orders"
          ).catch(() => {});
          updatedCount++;
          results.push({ orderId: order.id, providerOrderId, status: "completed", note });
        } else if (isFailure) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const oCheck = await client.query("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [order.id]);
            if (oCheck.rows.length > 0 && oCheck.rows[0].status === "pending") {
              // Update order to rejected
              const reasonText = note || rawStatus;
              await client.query(
                `UPDATE orders SET status='rejected', notes = notes || $1, updated_at=NOW() WHERE id=$2`,
                [` | تم الرفض من المزود تلقائياً ❌ (${reasonText})`, order.id]
              );

              // Auto-refund if not already refunded
              const refCheck = await client.query(
                "SELECT id FROM wallet_transactions WHERE user_id=$1 AND type='refund' AND ref_id=$2 LIMIT 1",
                [order.user_id, order.id]
              );
              if (refCheck.rows.length === 0) {
                const cost = parseFloat(order.amount);
                await client.query(
                  "UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2",
                  [cost, order.user_id]
                );
                await client.query(
                  "INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'refund', $2, $3, $4)",
                  [order.user_id, cost, `استرجاع رصيد تلقائي - رفض طلب ${order.item_name}: ${reasonText}`, order.id]
                );
              }
              await client.query("COMMIT");

              sendPushToUser(
                order.user_id,
                "❌ تم رفض طلب الشحن واسترجاع الرصيد",
                `تم رفض طلب ${order.item_name} (${reasonText}) وتمت إعادة ${order.amount} ${order.currency} إلى محفظتك تلقائياً.`,
                "/orders"
              ).catch(() => {});

              sendPushToAdmins(
                "❌ رفض طلب شحن تلقائياً",
                `تم رفض الطلب #${order.id} من المزود (${reasonText}) وتم استرجاع الرصيد للعميل آلياً.`,
                "/admin"
              ).catch(() => {});

              updatedCount++;
              results.push({ orderId: order.id, providerOrderId, status: "rejected", reasonText });
            } else {
              await client.query("ROLLBACK");
            }
          } catch (err: any) {
            await client.query("ROLLBACK").catch(() => {});
            console.error(`Error updating order #${order.id}:`, err);
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        // Individual order check error (timeout etc) — skip and continue
      }
    }
  } catch (globalErr: any) {
    console.error("Error in syncPendingYazanOrders:", globalErr);
  }

  return { checked: results.length, updated: updatedCount, results };
}

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Starts automatic polling background worker
 */
export function startYazanSyncWorker(intervalMs: number = 20000): void {
  if (syncInterval) return;
  console.log(`🚀 YazanCard Auto-Sync Worker started (every ${intervalMs / 1000}s)`);

  // Initial run after 5 seconds
  setTimeout(() => {
    syncPendingYazanOrders().catch(() => {});
  }, 5000);

  syncInterval = setInterval(() => {
    syncPendingYazanOrders().catch(() => {});
  }, intervalMs);
}
