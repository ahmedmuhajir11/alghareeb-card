import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.post("/mock-charging", (req: Request, res: Response): void => {
  const { api_key, order_id, item_name, package_name, target_id, quantity } = req.body ?? {};

  if (!api_key) {
    res.status(401).json({ success: false, error: "Missing api_key" });
    return;
  }

  if (api_key !== "TEST_API_KEY_123") {
    res.status(403).json({ success: false, error: "Invalid api_key" });
    return;
  }

  if (!target_id) {
    res.status(400).json({ success: false, error: "Missing target_id (player/user ID)" });
    return;
  }

  res.json({
    success: true,
    transaction_id: `MOCK-${Date.now()}`,
    order_id,
    item: item_name,
    package: package_name,
    quantity,
    target: target_id,
    message: "Charging completed successfully (mock)",
    charged_at: new Date().toISOString(),
  });
});

export default router;
