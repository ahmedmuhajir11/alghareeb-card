import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_USERNAME = "abuhani";
const ADMIN_PASSWORD = "abohane12345";
const JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const COOKIE_NAME = "admin_token";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // 1. Check x-admin-key header (sessionStorage _ak)
  const ak = (req.headers["x-admin-key"] as string) || "";
  if (ak) {
    try {
      const decoded = Buffer.from(ak, "base64").toString("utf8");
      const [u, p] = decoded.split(":");
      if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
        next();
        return;
      }
    } catch {}
  }

  // 2. Check admin_token cookie or Bearer header
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
      if (payload.isAdmin === true) {
        next();
        return;
      }
    } catch {}
  }

  res.status(401).json({ error: "غير مصرح" });
}
