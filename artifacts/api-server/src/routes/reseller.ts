import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";

const router = Router();

function getClientIp(req: Request): string {
  return (
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}

async function requireResellerToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = (req.headers["api-token"] as string) || req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "مطلوب Api-Token في الهيدر" });
    return;
  }
  try {
    const result = await pool.query(
      "SELECT id, allowed_ips FROM users WHERE api_token=$1 AND is_reseller=true",
      [token]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: "التوكن غير صالح أو غير مفعّل" });
      return;
    }

    // IP whitelist check
    const allowedIps: string = result.rows[0].allowed_ips || "";
    if (allowedIps.trim()) {
      const ipList = allowedIps.split("\n").map((ip: string) => ip.trim()).filter(Boolean);
      if (ipList.length > 0) {
        const clientIp = getClientIp(req);
        if (!ipList.includes(clientIp)) {
          res.status(403).json({ error: `IP غير مسموح بالوصول: ${clientIp}` });
          return;
        }
      }
    }

    (req as any).resellerId = result.rows[0].id;
    next();
  } catch {
    res.status(500).json({ error: "خطأ داخلي" });
  }
}

// GET /api/reseller/products
router.get("/reseller/products", requireResellerToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const sections = await pool.query(
      `SELECT id, name_ar, name_en, logo_url FROM sections WHERE is_active=true ORDER BY sort_order ASC`
    );
    const items = await pool.query(
      `SELECT id, name_ar, name_en, icon_url, section_id, price_per_unit, currency_unit, min_quantity
       FROM items WHERE is_active=true AND is_available=true ORDER BY sort_order ASC`
    );
    const packages = await pool.query(
      `SELECT p.id, p.item_id, p.label, p.amount, p.price_usd
       FROM packages p JOIN items i ON i.id=p.item_id AND i.is_active=true
       ORDER BY p.sort_order ASC`
    );

    const data = sections.rows.map((s: any) => ({
      id: s.id,
      nameAr: s.name_ar,
      nameEn: s.name_en,
      logoUrl: s.logo_url,
      items: items.rows
        .filter((i: any) => i.section_id === s.id)
        .map((i: any) => ({
          id: i.id,
          nameAr: i.name_ar,
          nameEn: i.name_en,
          iconUrl: i.icon_url,
          pricePerUnit: parseFloat(i.price_per_unit ?? 0),
          currencyUnit: i.currency_unit,
          minQuantity: i.min_quantity,
          packages: packages.rows
            .filter((p: any) => p.item_id === i.id)
            .map((p: any) => ({
              id: p.id,
              label: p.label,
              amount: parseFloat(p.amount ?? 0),
              priceUsd: parseFloat(p.price_usd ?? 0),
            })),
        })),
    }));

    res.json({ sections: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reseller/save-ips — save allowed IPs for the logged-in reseller
router.post("/reseller/save-ips", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "غير مصرح" }); return; }
  try {
    const u = await pool.query("SELECT id, is_reseller FROM users WHERE id=$1", [userId]);
    if (u.rows.length === 0 || !u.rows[0].is_reseller) {
      res.status(403).json({ error: "غير مفعّل كـ Reseller" });
      return;
    }
    // Sanitize: keep only valid-looking lines, trim blanks
    const raw: string = (req.body?.ips ?? "").toString();
    const cleaned = raw.split("\n").map((l: string) => l.trim()).filter(Boolean).join("\n");
    await pool.query("UPDATE users SET allowed_ips=$1, updated_at=NOW() WHERE id=$2", [cleaned || null, userId]);
    res.json({ success: true, allowedIps: cleaned || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reseller/regenerate-token — logged-in reseller regenerates their own token
router.post("/reseller/regenerate-token", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "غير مصرح" }); return; }
  try {
    const u = await pool.query("SELECT id, is_reseller FROM users WHERE id=$1", [userId]);
    if (u.rows.length === 0 || !u.rows[0].is_reseller) {
      res.status(403).json({ error: "غير مفعّل كـ Reseller" });
      return;
    }
    const crypto = await import("crypto");
    const newToken = crypto.randomBytes(32).toString("hex");
    await pool.query("UPDATE users SET api_token=$1, updated_at=NOW() WHERE id=$2", [newToken, userId]);
    res.json({ success: true, apiToken: newToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
