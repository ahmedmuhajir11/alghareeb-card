import { pool } from "@workspace/db";
import { sendPushToUser, sendPushToAdmins } from "../routes/push";
import { extractProviderUsername } from "../lib/order-status";

/**
 * Parses any response structure from YazanCard / Syria4Game /check endpoint
 */
function parseCheckStatus(checkData: any, providerOrderId: string): { status: string; note: string; receiptUrl?: string; username?: string | null } | null {
  if (!checkData) return null;

  let orderInfo: any = null;
  const cleanPid = providerOrderId.replace(/^ID_/i, "").trim();

  // Case A: checkData.data is an array
  if (Array.isArray(checkData.data)) {
    orderInfo = checkData.data.find((o: any) => {
      const oid = String(o?.order_id || o?.id || o?.order_uuid || o?.uuid || "");
      const cleanOid = oid.replace(/^ID_/i, "").trim();
      return (
        (oid && (oid.includes(providerOrderId) || providerOrderId.includes(oid))) ||
        (cleanOid && cleanPid && (cleanOid === cleanPid || cleanOid.includes(cleanPid) || cleanPid.includes(cleanOid)))
      );
    }) || checkData.data[0];
  }
  // Case B: checkData.data is a single order object or keyed by order_id
  else if (checkData.data && typeof checkData.data === "object") {
    if (
      typeof checkData.data.status === "string" ||
      typeof checkData.data.state === "string" ||
      typeof checkData.data.order_status === "string"
    ) {
      orderInfo = checkData.data;
    } else if (checkData.data[providerOrderId] && typeof checkData.data[providerOrderId] === "object") {
      orderInfo = checkData.data[providerOrderId];
    } else if (checkData.data[cleanPid] && typeof checkData.data[cleanPid] === "object") {
      orderInfo = checkData.data[cleanPid];
    } else if (checkData.data[`ID_${cleanPid}`] && typeof checkData.data[`ID_${cleanPid}`] === "object") {
      orderInfo = checkData.data[`ID_${cleanPid}`];
    } else {
      const keys = Object.keys(checkData.data);
      if (keys.length > 0 && typeof checkData.data[keys[0]] === "object") {
        orderInfo = checkData.data[keys[0]];
      } else {
        orderInfo = checkData.data;
      }
    }
  }
  // Case C: checkData.orders
  else if (checkData.orders) {
    if (Array.isArray(checkData.orders)) {
      orderInfo = checkData.orders.find((o: any) => {
        const oid = String(o?.order_id || o?.id || o?.order_uuid || o?.uuid || "");
        const cleanOid = oid.replace(/^ID_/i, "").trim();
        return (
          (oid && (oid.includes(providerOrderId) || providerOrderId.includes(oid))) ||
          (cleanOid && cleanPid && (cleanOid === cleanPid || cleanOid.includes(cleanPid) || cleanPid.includes(cleanOid)))
        );
      }) || checkData.orders[0];
    } else if (typeof checkData.orders === "object") {
      if (
        typeof checkData.orders.status === "string" ||
        typeof checkData.orders.state === "string" ||
        typeof checkData.orders.order_status === "string"
      ) {
        orderInfo = checkData.orders;
      } else if (checkData.orders[providerOrderId] && typeof checkData.orders[providerOrderId] === "object") {
        orderInfo = checkData.orders[providerOrderId];
      } else if (checkData.orders[cleanPid] && typeof checkData.orders[cleanPid] === "object") {
        orderInfo = checkData.orders[cleanPid];
      } else if (checkData.orders[`ID_${cleanPid}`] && typeof checkData.orders[`ID_${cleanPid}`] === "object") {
        orderInfo = checkData.orders[`ID_${cleanPid}`];
      } else {
        const firstVal = Object.values(checkData.orders)[0];
        orderInfo = typeof firstVal === "object" ? firstVal : checkData.orders;
      }
    }
  }
  // Case D: checkData itself has the status
  else if (checkData.status && typeof checkData.status === "string" && checkData.status !== "OK") {
    orderInfo = checkData;
  }

  if (!orderInfo || typeof orderInfo !== "object") return null;

  const rawStatus = String(
    orderInfo.status || orderInfo.state || orderInfo.order_status || orderInfo.result || ""
  ).toLowerCase().trim();

  const note = String(orderInfo.note || orderInfo.msg || orderInfo.message || orderInfo.error || orderInfo.details || "");
  const receiptUrl = orderInfo.receipt || orderInfo.image || orderInfo.img || orderInfo.url || undefined;
  const username = extractProviderUsername(orderInfo);

  return { status: rawStatus, note, receiptUrl, username };
}

/**
 * Extracts the order_uuid embedded by orders-user.ts in the notes field.
 * Format: "... [uuid:SOME-UUID-VALUE]"
 */
export function extractOrderUuid(notes: string | null | undefined): string | null {
  const m = String(notes || "").match(/\[uuid:([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

/**
 * Extracts the YazanCard provider order ID from notes.
 * Returns null if value is N/A, undefined, or missing.
 */
export function extractProviderOrderId(notes: string | null | undefined): string | null {
  const text = String(notes || "");
  const match = text.match(/معرف العملية:\s*([^\s|\[]+)/);
  if (!match) return null;
  const val = match[1].trim();
  if (!val || /^(N\/A|undefined|null)$/i.test(val)) return null;
  return val;
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
       LEFT JOIN items i ON (i.name_ar = o.item_name OR i.name_en = o.item_name)
       LEFT JOIN packages p ON (p.label = o.package_name AND (p.item_id = i.id OR i.id IS NULL))
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

      // ── Case 2: Order is waiting for YazanCard — query /client/api/check ──────
      //
      // FIX: When YazanCard responds with status=wait but sends order_id=null,
      // the notes contain "معرف العملية: N/A [uuid:SOME-UUID]".
      // We now fall back to the uuid for the /check lookup, which solves the
      // "orders stuck on pending forever" bug.
      const providerOrderId = extractProviderOrderId(notesStr);
      const orderUuid       = extractOrderUuid(notesStr);

      // The lookup key for /check: prefer numeric provider ID, fall back to uuid
      const lookupId = providerOrderId || orderUuid;

      if (!lookupId) {
        console.log(`[YazanSync] Order #${order.id}: no provider order ID or uuid in notes — skipping`);
        continue;
      }

      // YazanCard /check only accepts a single order ID — never send comma-separated
      // Use the full ID as-is (including ID_ prefix if present)
      const queryParam = lookupId;

      // Resolve API credentials
      const apiEndpoint: string = order.pkg_ep || order.item_ep || "";
      let apiKey = (order.pkg_key || order.item_key || "").trim();

      if (!apiKey || apiKey.includes("PLACEHOLDER")) {
        apiKey = (process.env.YAZANCARD_TOKEN || "").trim();
      }
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

      if (!apiKey || apiKey.includes("PLACEHOLDER")) {
        console.warn(`[YazanSync] No valid API token available for order #${order.id}`);
        continue;
      }

      let baseUrl = "https://api.yazancard.com/client/api";
      if (apiEndpoint) {
        baseUrl = apiEndpoint.replace(/\/newOrder\/.*$/, "").replace(/\/+$/, "");
        if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
      }

      try {
        console.log(
          `[YazanSync] /check → order #${order.id}` +
          ` (lookup: "${queryParam}"` +
          `${providerOrderId ? "" : " [uuid fallback]"}` +
          `, token: ${apiKey.slice(0, 4)}...)`
        );
        let activeKey = apiKey;
        const cleanLookup = queryParam.replace(/^ID_/i, "").trim();

        // Helper to do a single clean check request (NEVER pass duplicate case-insensitive headers!)
        const doCheckFetch = async (targetId: string, inQuery: boolean) => {
          const u = inQuery
            ? `${baseUrl}/check?orders=${encodeURIComponent(targetId)}&api-token=${encodeURIComponent(activeKey)}`
            : `${baseUrl}/check?orders=${encodeURIComponent(targetId)}`;
          return fetch(u, {
            headers: { "api-token": activeKey },
            signal: AbortSignal.timeout(10000),
          });
        };

        // Try 1: with header only and original ID
        let apiRes = await doCheckFetch(queryParam, false);

        // Try 2: if 401, try with token in query param too
        if (apiRes.status === 401) {
          apiRes = await doCheckFetch(queryParam, true);
        }

        // Try 3: if still 401/404 and has ID_ prefix, try clean ID (without ID_)
        if (!apiRes.ok && cleanLookup && cleanLookup !== queryParam) {
          const resClean = await doCheckFetch(cleanLookup, false);
          if (resClean.ok) {
            apiRes = resClean;
          } else {
            const resCleanQuery = await doCheckFetch(cleanLookup, true);
            if (resCleanQuery.ok) apiRes = resCleanQuery;
          }
        }

        if (!apiRes.ok) {
          console.warn(`[YazanSync] /check HTTP ${apiRes.status} for order #${order.id} (target: ${queryParam})`);
          continue;
        }

        const rawText = await apiRes.text().catch(() => "");
        let apiData: any = {};
        try { apiData = JSON.parse(rawText); } catch { continue; }

        console.log(`[YazanSync] /check response for order #${order.id}:`, rawText.slice(0, 300));

        const parsed = parseCheckStatus(apiData, lookupId);
        if (!parsed) {
          console.log(`[YazanSync] Could not parse status for order #${order.id} — leaving pending`);
          continue;
        }

        const { status: rawStatus, note } = parsed;

        const rawStatusLower = rawStatus.toLowerCase();
        const noteLower = note.toLowerCase();

        const isSuccess =
          rawStatusLower === "accept" ||
          rawStatusLower === "accepted" ||
          rawStatusLower === "completed" ||
          rawStatusLower === "success" ||
          rawStatusLower === "approved" ||
          rawStatusLower === "done" ||
          rawStatusLower === "ok" ||
          rawStatusLower === "مكتمل" ||
          rawStatusLower === "مقبول" ||
          rawStatusLower === "تم" ||
          rawStatusLower === "1";

        const isFailure =
          rawStatusLower === "refuse" ||
          rawStatusLower === "refused" ||
          rawStatusLower === "rejected" ||
          rawStatusLower === "reject" ||
          rawStatusLower === "failed" ||
          rawStatusLower === "fail" ||
          rawStatusLower === "canceled" ||
          rawStatusLower === "cancelled" ||
          rawStatusLower === "cancel" ||
          rawStatusLower === "error" ||
          rawStatusLower === "مرفوض" ||
          rawStatusLower === "ملغى" ||
          rawStatusLower.includes("not found") ||
          rawStatusLower.includes("user not found") ||
          noteLower.includes("user not found") ||
          noteLower.includes("not found") ||
          noteLower.includes("error") ||
          noteLower.includes("fail") ||
          noteLower.includes("reject") ||
          noteLower.includes("refuse") ||
          note.includes("غير موجود") ||
          note.includes("مرفوض");

        if (isSuccess) {
          const receiptSuffix = parsed.receiptUrl ? ` | ${parsed.receiptUrl}` : "";
          await pool.query(
            `UPDATE orders SET status='completed', provider_username = COALESCE($1, provider_username), notes = COALESCE(notes,'') || $2, updated_at=NOW() WHERE id=$3 AND status='pending'`,
            [parsed.username ?? null, ` | تأكيد عبر المزامنة الآلية ✅${receiptSuffix}`, order.id]
          );
          sendPushToUser(
            order.user_id,
            "✅ تم تنفيذ طلب الشحن",
            `تم شحن ${order.item_name} بنجاح. شكراً لك!`,
            "/orders"
          ).catch(() => {});
          sendPushToAdmins(
            "✅ اكتمال شحن تلقائي (Polling)",
            `تم تأكيد الطلب #${order.id} بنجاح عبر المزامنة الدورية.`,
            "/admin"
          ).catch(() => {});
          updatedCount++;
          results.push({ orderId: order.id, lookupId, status: "completed", note });
        } else if (isFailure) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const oCheck = await client.query("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [order.id]);
            if (oCheck.rows.length > 0 && oCheck.rows[0].status === "pending") {
              const reasonText = note || rawStatus;
              await client.query(
                `UPDATE orders SET status='rejected', notes = COALESCE(notes,'') || $1, updated_at=NOW() WHERE id=$2`,
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
              results.push({ orderId: order.id, lookupId, status: "rejected", reasonText });
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

  // Initial run after 5 seconds (give the server time to fully start)
  setTimeout(() => {
    syncPendingYazanOrders().catch((e) => console.error("[YazanSync] initial run error:", e));
  }, 5000);

  syncInterval = setInterval(() => {
    syncPendingYazanOrders().catch((e) => console.error("[YazanSync] interval run error:", e));
  }, intervalMs);
}

/**
 * Stops the background sync worker (useful for graceful shutdown / tests)
 */
export function stopYazanSyncWorker(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("🛑 YazanCard Auto-Sync Worker stopped");
  }
}
