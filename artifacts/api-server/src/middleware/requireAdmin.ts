import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const COOKIE_NAME = "admin_token";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { isAdmin?: boolean };
    if (payload.isAdmin === true) {
      next();
      return;
    }
  } catch {
    // invalid token
  }
  res.status(401).json({ error: "غير مصرح" });
}
