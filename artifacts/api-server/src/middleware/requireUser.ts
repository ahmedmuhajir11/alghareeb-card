import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "المستخدم غير موجود" });
      return;
    }
    (req as any).currentUser = result.rows[0];
    next();
  } catch {
    res.status(500).json({ error: "خطأ في التحقق" });
  }
}
