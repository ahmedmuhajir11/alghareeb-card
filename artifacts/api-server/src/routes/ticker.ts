import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import jwt from "jsonwebtoken";

const router: IRouter = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const ADMIN_USERNAME = "abuhani";
const ADMIN_PASSWORD = "abohane12345";

pool.query(`
  CREATE TABLE IF NOT EXISTS ticker_messages (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).then(async () => {
  const { rows } = await pool.query(`SELECT COUNT(*) as total FROM ticker_messages`);
  if (parseInt(rows[0].total) === 0) {
    await pool.query(`
      INSERT INTO ticker_messages (text, sort_order) VALUES
      ('🔥 خصم 4% على شحن التطبيقات — اطلب الآن عبر واتساب', 1),
      ('⚡ تنفيذ الطلبات خلال دقائق على مدار الساعة', 2),
      ('🛡️ موقع آمن ومشفر — ادفع بأمان واستلم بسرعة', 3)
    `);
  }
}).catch((err: any) => console.error("ticker_messages init error:", err?.message));

function isAdmin(req: Request): boolean {
  const ak = req.headers["x-admin-key"] as string || "";
  try {
    const decoded = Buffer.from(ak, "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) return true;
  } catch {}
  const token = req.cookies?.admin_token || req.headers.authorization?.slice(7);
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
    return payload.isAdmin === true;
  } catch { return false; }
}

router.get("/ticker-messages", async (_req, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, text, is_active, sort_order FROM ticker_messages ORDER BY sort_order ASC, id ASC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/admin/ticker-messages", async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "غير مصرح" }); return; }
  const { text, sort_order } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: "النص مطلوب" }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO ticker_messages (text, sort_order) VALUES ($1, $2) RETURNING *`,
      [text.trim(), sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.put("/admin/ticker-messages/:id", async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "غير مصرح" }); return; }
  const { id } = req.params;
  const { text, is_active, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE ticker_messages SET text=$1, is_active=$2, sort_order=$3 WHERE id=$4 RETURNING *`,
      [text, is_active, sort_order, id]
    );
    if (!rows.length) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.delete("/admin/ticker-messages/:id", async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "غير مصرح" }); return; }
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM ticker_messages WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
