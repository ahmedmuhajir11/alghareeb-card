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
    // Find all pending orders created in the last 7 days
    const pendingOrdersRes = await pool.query(
      `SELECT o.*,
              i.api_endpoint AS item_ep, i.api_key AS item_key,
              p.api_endpoint AS pkg_ep, p.api_key AS pkg_key
       FROM orders o
       LEFT JOIN items i ON i.name_ar = o.item_name
       LEFT JOIN packages p ON p.label = o.package_name AND p.item_id = i.id
       WHERE o.status = 'pending'
         AND o.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY o.id DESC`
    );

    const orders = pendingOrdersRes.rows;
    if (orders.length === 0) {
      return { checked: 0, updated: 0, results: [] };
    }

    console.log(`[YazanSync] Checking ${orders.length} pending order(s)...`);

    for (const order of orders) {
      const notesStr = String(order.notes || "");

      // Case 1: Order already has failure in notes (e.g. User Not Found, failed)
      const isAlreadyFailed =
        notesStr.includes("فشل الشحن التلقائي") ||
        notesStr.toLowerCase().includes("user not found") ||
        notesStr.includes("مرفوض") ||
        notesStr.toLowerCase().includes("error") ||
        notesStr.toLowerCase().includes("failed");

      if (isAlreadyFailed) {
        console.log(`[YazanSync] Order #${order.id} already failed in notes. Auto-refunding now...`);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const oCheck = await client.query("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [order.id]);
          if (oCheck.rows.length > 0 && oCheck.rows[0].status === "pending") {
            const cost = parseFloat(order.amount);

            // Check if refund was already given
            const refCheck = await client.query(
              "SELECT id FROM wallet_transactions WHERE user_id=$1 AND type='refund' AND ref_id=$2 LIMIT 1",
              [order.user_id, order.id]
            );
            if (refCheck.rows.length === 0) {
              await client.query(
                "UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2",
                [cost, order.user_id]
              );
              await client.query(
                "INSERT INTO wallet_transactions (user_id, type, amount, description, ref_id) VALUES ($1, 'refund', $2, $3, $4)",
                [order.user_id, cost, `استرجاع رصيد تلقائي - فشل شحن ${order.item_name} (User Not Found)`, order.id]
              );
            }

            await client.query(
              `UPDATE orders SET status='rejected', notes = notes || ' | تم الإلغاء والاسترجاع التلقائي ❌', updated_at=NOW() WHERE id=$1`,
              [order.id]
            );
            await client.query("COMMIT");

            sendPushToUser(
              order.user_id,
              "❌ تم رفض طلب الشحن واسترجاع الرصيد",
              `تم رفض طلب ${order.item_name} (المعرف غير صحيح) وتمت إعادة ${order.amount} ${order.currency} إلى محفظتك تلقائياً.`,
              "/orders"
            ).catch(() => {});

            updatedCount++;
            results.push({ orderId: order.id, status: "rejected", action: "auto-refunded", reason: "Already failed in notes" });
          } else {
            await client.query("ROLLBACK");
          }
        } catch (err: any) {
          await client.query("ROLLBACK").catch(() => {});
          console.error(`[YazanSync] Error processing failed order #${order.id}:`, err);
        } finally {
          client.release();
        }
        continue;
      }

      // Case 2: Order is waiting for YazanCard confirmation — query /client/api/check
      const match = notesStr.match(/(?:معرف العملية:\s*|ID_)([a-zA-Z0-9_]+)/i);
      const providerOrderId = match
        ? (match[0].startsWith("معرف العملية:") ? match[1].trim() : match[0].trim())
        : null;

      if (!providerOrderId || providerOrderId === "N/A") {
        continue;
      }

      // Resolve endpoint and key
      const apiEndpoint: string = order.pkg_ep || order.item_ep || "";
      let apiKey = (order.pkg_key || order.item_key || "").trim();

      // If missing or contains placeholder, pull from process.env.YAZANCARD_TOKEN
      if (!apiKey || apiKey.includes("PLACEHOLDER")) {
        apiKey = (process.env.YAZANCARD_TOKEN || "").trim();
      }

      // If still missing, query DB for any existing valid non-placeholder token
      if (!apiKey || apiKey.includes("PLACEHOLDER")) {
        try {
          const validKeyRes = await pool.query(
            `SELECT api_key FROM packages WHERE api_key IS NOT NULL AND api_key <> '' AND api_key NOT ILIKE '%PLACEHOLDER%'
             UNION ALL
             SELECT api_key FROM items WHERE api_key IS NOT NULL AND api_key <> '' AND api_key NOT ILIKE '%PLACEHOLDER%'
             LIMIT 1`
          );
          if (validKeyRes.rows.length > 0 && validKeyRes.rows[0].api_key) {
            apiKey = validKeyRes.rows[0].api_key.trim();
          }
        } catch {}
      }

      const isYazan = apiEndpoint.includes("yazancard.com") || apiEndpoint.includes("/client/api/") || Boolean(apiKey);

      if (!isYazan || !apiKey || apiKey.includes("PLACEHOLDER")) {
        console.warn(`[YazanSync] No valid API token available for order #${order.id} (key: "${apiKey}")`);
        continue;
      }

      let baseUrl = "https://api.yazancard.com/client/api";
      if (apiEndpoint) {
        baseUrl = apiEndpoint.replace(/\/newOrder\/.*$/, "").replace(/\/+$/, "");
        if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
      }

      try {
        console.log(`[YazanSync] Querying /check for order #${order.id} (provider ID: ${providerOrderId}, token: ${apiKey.slice(0, 4)}...)...`);
        const checkUrl = `${baseUrl}/check?orders=${encodeURIComponent(providerOrderId)}&api-token=${encodeURIComponent(apiKey)}`;
        const apiRes = await fetch(checkUrl, {
          headers: {
            "api-token": apiKey,
            "Api-Token": apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!apiRes.ok) {
          console.warn(`[YazanSync] /check HTTP ${apiRes.status} for order #${order.id}`);
          continue;
        }

        const rawText = await apiRes.text().catch(() => "");
        let apiData: any = {};
        try { apiData = JSON.parse(rawText); } catch { continue; }

        console.log(`[YazanSync] Response for order #${order.id}:`, rawText.slice(0, 200));

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
            console.error(`[YazanSync] Error updating order #${order.id}:`, err);
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        console.warn(`[YazanSync] Error checking order #${order.id}:`, err?.message);
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

  // Initial run after 3 seconds
  setTimeout(() => {
    syncPendingYazanOrders().catch(() => {});
  }, 3000);

  syncInterval = setInterval(() => {
    syncPendingYazanOrders().catch(() => {});
  }, intervalMs);
}
