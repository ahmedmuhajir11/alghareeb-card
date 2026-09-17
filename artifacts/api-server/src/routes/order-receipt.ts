import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";
import { isOrderSuccessful } from "../lib/order-status";
import { streamOrderProofPdf } from "../lib/generate-order-pdf";

const router: IRouter = Router();

/**
 * Protected proof-of-payment PDF download.
 *
 * Security checks are performed here, server-side, in this exact order —
 * the client's belief about the order's status is NEVER trusted:
 *   1. Requester must be authenticated (requireUser).
 *   2. The order must belong to the authenticated user (user_id = current user).
 *   3. The order's status IN THE DATABASE must be the confirmed success
 *      value. Nothing else — not "pending", not the mere existence of an
 *      order id, not a successful HTTP call to the provider — qualifies.
 * Only once all three checks pass is a PDF generated and returned.
 */
router.get("/orders/:id/receipt", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  const orderId = parseInt(String(req.params.id), 10);

  if (!orderId || isNaN(orderId)) {
    res.status(400).json({ error: "رقم طلب غير صالح" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, item_name, item_name_en, package_name, target_id,
              provider_username, amount, currency, status, created_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, user.id]
    );

    if (result.rows.length === 0) {
      // Deliberately the same generic message whether the order doesn't
      // exist at all or belongs to someone else — never confirm/deny
      // the existence of another user's order.
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const order = result.rows[0];

    if (!isOrderSuccessful(order.status)) {
      res.status(403).json({ error: "إثبات الدفع غير متاح إلا للطلبات المكتملة بنجاح" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${order.id}.pdf"`);

    await streamOrderProofPdf({
      orderId: order.id,
      itemNameAr: order.item_name,
      itemNameEn: order.item_name_en || null,
      packageName: order.package_name || null,
      targetId: order.target_id || null,
      providerUsername: order.provider_username || null,
      amount: parseFloat(order.amount),
      currency: order.currency,
      status: order.status,
      createdAt: new Date(order.created_at),
    }, res);
  } catch (err: any) {
    console.error("[order-receipt] error generating PDF:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "تعذر إنشاء ملف إثبات الدفع" });
    }
  }
});

export default router;
