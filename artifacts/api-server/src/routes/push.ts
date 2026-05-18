import { Router, type IRouter, type Request } from "express";
import webpush from "web-push";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

const VAPID_PUBLIC = "BKUnjuU6KRBrRoyRoRNZr1IWmssQfO3lwMUuBcTcnk_gYvhK4zNCSiJzSajeylYA6V9pFThEwUXV-oqFIcrrU5U";
const VAPID_PRIVATE = "1z6uP7noVsNWdzcWa_RAHIGdQA_W7sFS0xvg4X6h9w8";
const ADMIN_JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const ADMIN_COOKIE_NAME = "admin_token";

function isRequestAdmin(req: Request): boolean {
  const token = req.cookies?.[ADMIN_COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) return false;
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as { isAdmin?: boolean };
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_admin ON push_subscriptions(is_admin) WHERE is_admin = TRUE`);
  } catch (err: any) {
    console.error("push_subscriptions table init error:", err?.message);
  }
})();

webpush.setVapidDetails("mailto:support@alghareebcard.com", VAPID_PUBLIC, VAPID_PRIVATE);

router.get("/push/vapid-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});


router.post("/push/subscribe", async (req, res): Promise<void> => {
  const { endpoint, keys, isAdmin: requestedAdmin } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  const userId = (req.session as any)?.userId ?? null;
  // Only set is_admin=true when the client requested it AND a valid admin token is present.
  // Otherwise pass NULL and let COALESCE preserve any existing value (so re-registers don't drop the flag).
  const setAdmin: boolean | null = requestedAdmin === true && isRequestAdmin(req) ? true : null;
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, is_admin)
       VALUES ($1, $2, $3, $4, COALESCE($5::boolean, FALSE))
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
         is_admin = COALESCE($5::boolean, push_subscriptions.is_admin)`,
      [endpoint, keys.p256dh, keys.auth, userId, setAdmin]
    );
    res.status(201).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save subscription", detail: err?.message });
  }
});

router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  try {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

async function deliverPush(rows: any[], title: string, body: string, url: string) {
  if (rows.length === 0) return { sent: 0, failed: 0 };
  const results = await Promise.allSettled(
    rows.map((sub: any) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, tag: url })
      )
    )
  );
  const stale: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = (r.reason as any)?.statusCode;
      if (code === 404 || code === 410) stale.push(rows[i].endpoint);
    }
  });
  if (stale.length) {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`, [stale]).catch(() => {});
  }
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent: rows.length, failed };
}

export async function sendPushNotification(title: string, body: string, url = "/") {
  try {
    const { rows } = await pool.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
    const r = await deliverPush(rows, title, body, url);
    console.log(`Push (broadcast): sent to ${r.sent} subs, ${r.failed} failed`);
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

export async function sendPushToUser(userId: number, title: string, body: string, url = "/") {
  if (!userId) return;
  try {
    const { rows } = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const r = await deliverPush(rows, title, body, url);
    console.log(`Push (user ${userId}): sent to ${r.sent} subs, ${r.failed} failed`);
  } catch (err) {
    console.error("Push-to-user error:", err);
  }
}

export async function sendPushToAdmins(title: string, body: string, url = "/admin") {
  try {
    const { rows } = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE is_admin = TRUE`
    );
    const r = await deliverPush(rows, title, body, url);
    console.log(`Push (admins): sent to ${r.sent} subs, ${r.failed} failed`);
  } catch (err) {
    console.error("Push-to-admins error:", err);
  }
}

router.post("/push/welcome", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "غير مسجّل" }); return; }
  try {
    const { rows } = await pool.query("SELECT name, balance, currency FROM users WHERE id=$1", [userId]);
    if (!rows[0]) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    const { name, balance } = rows[0];
    const firstName = (name as string).split(" ")[0];
    const hasBalance = parseFloat(balance || "0") > 0;
    const body = hasBalance
      ? `رصيدك جاهز للشحن! شحّن ألعابك وتطبيقاتك المفضلة الآن 🎮`
      : `أضف رصيداً الآن وابدأ الشحن الفوري لألعابك وتطبيقاتك 🚀`;
    await sendPushToUser(userId, `أهلاً بك ${firstName}! 👋`, body, "/payment-methods");
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/admin/push/notify", requireAdmin, async (req, res): Promise<void> => {
  const { title, body, url } = req.body;
  if (!title || !body) { res.status(400).json({ error: "العنوان والنص مطلوبان" }); return; }

  try {
    const { rows } = await pool.query(`SELECT COUNT(*) as total FROM push_subscriptions`);
    const total = parseInt(rows[0].total);
    await sendPushNotification(title, body, url || "/");
    res.json({ ok: true, sent: total });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
