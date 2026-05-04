import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";

const router: IRouter = Router();

// Get wallet info
router.get("/wallet", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  try {
    const txResult = await pool.query(
      `SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );
    const totalPurchases = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE user_id=$1 AND type='purchase'`,
      [user.id]
    );
    const totalDeposits = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE user_id=$1 AND type='deposit'`,
      [user.id]
    );
    res.json({
      balance: parseFloat(user.balance),
      currency: user.currency,
      totalPurchases: parseFloat(totalPurchases.rows[0].total),
      totalDeposits: parseFloat(totalDeposits.rows[0].total),
      transactions: txResult.rows.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        createdAt: t.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في جلب المحفظة" });
  }
});

export default router;
