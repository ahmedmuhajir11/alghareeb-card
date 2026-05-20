import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireUser } from "../middleware/requireUser";

const router: IRouter = Router();

// Admin: list overrides for a specific item
router.get("/admin/user-item-prices/:itemId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const itemId = parseInt(req.params.itemId as string);
  if (!itemId) { res.status(400).json({ error: "itemId مطلوب" }); return; }
  const result = await pool.query(
    `SELECT uip.id, uip.account_number, uip.item_id, uip.price_per_unit, uip.created_at,
            u.name, u.email
     FROM user_item_prices uip
     LEFT JOIN users u ON u.account_number = uip.account_number
     WHERE uip.item_id = $1
     ORDER BY uip.created_at DESC`,
    [itemId]
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    accountNumber: r.account_number,
    itemId: r.item_id,
    pricePerUnit: parseFloat(r.price_per_unit),
    createdAt: r.created_at,
    userName: r.name || r.email || null,
  })));
});

// Admin: upsert override
router.post("/admin/user-item-prices", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { accountNumber, itemId, pricePerUnit } = req.body ?? {};
  if (!accountNumber || !itemId || pricePerUnit == null) {
    res.status(400).json({ error: "accountNumber, itemId, pricePerUnit مطلوبة" }); return;
  }
  const result = await pool.query(
    `INSERT INTO user_item_prices (account_number, item_id, price_per_unit)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_number, item_id)
     DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
     RETURNING *`,
    [String(accountNumber), parseInt(itemId), parseFloat(pricePerUnit)]
  );
  const r = result.rows[0];
  res.json({ id: r.id, accountNumber: r.account_number, itemId: r.item_id, pricePerUnit: parseFloat(r.price_per_unit) });
});

// Admin: delete override
router.delete("/admin/user-item-prices/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  await pool.query("DELETE FROM user_item_prices WHERE id = $1", [id]);
  res.json({ success: true });
});

// User: get custom price for logged-in user on a specific item
router.get("/user-item-prices/item/:itemId", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  const itemId = parseInt(req.params.itemId as string);
  if (!itemId) { res.status(400).json({ error: "itemId مطلوب" }); return; }
  const result = await pool.query(
    `SELECT price_per_unit FROM user_item_prices WHERE account_number = $1 AND item_id = $2`,
    [user.accountNumber, itemId]
  );
  res.json({ customPricePerUnit: result.rows.length > 0 ? parseFloat(result.rows[0].price_per_unit) : null });
});

export default router;
