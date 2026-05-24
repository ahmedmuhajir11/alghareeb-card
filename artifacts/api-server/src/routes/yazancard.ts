import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

const YZ_API = "https://api.yazancard.com/client/api";

function getToken(): string | undefined {
  return process.env.YAZANCARD_TOKEN;
}

function guessCurrencyUnit(name: string): string {
  const n = name.toLowerCase();
  if (n.includes(" uc")) return "UC";
  if (n.includes("gem")) return "جواهر";
  if (n.includes("diamond")) return "ماسات";
  if (n.includes("coin")) return "كوينز";
  if (n.includes("token")) return "توكنز";
  if (n.includes("star")) return "نجوم";
  if (n.includes("gold")) return "ذهب";
  if (n.includes("cash")) return "كاش";
  if (n.includes("point")) return "نقاط";
  if (n.includes("credit") || n.includes("balance") || n.includes("tl") || n.includes("$")) return "رصيد";
  if (n.includes("month") || n.includes("year")) return "اشتراك";
  return "رصيد";
}

router.get("/admin/yazancard/products", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "YAZANCARD_TOKEN not configured on server" });
    return;
  }

  try {
    const response = await fetch(`${YZ_API}/products`, {
      headers: { "Api-Token": token },
    });

    if (!response.ok) {
      res.status(502).json({ error: "YazanCard API error: " + response.status });
      return;
    }

    const data = await response.json();
    const products = Object.values(data as Record<string, unknown>);

    const categories: Record<string, unknown[]> = {};
    for (const p of products as any[]) {
      const cat = (p.category_name as string) || "Other";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    }

    res.json({ products, categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/yazancard/import", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "YAZANCARD_TOKEN not configured on server" });
    return;
  }

  const { products, sectionId, markupPercent = 15 } = req.body;

  if (!Array.isArray(products) || !products.length || !sectionId) {
    res.status(400).json({ error: "products[] and sectionId are required" });
    return;
  }

  const markup = 1 + Number(markupPercent) / 100;
  const imported: string[] = [];
  const errors: string[] = [];

  for (const p of products) {
    try {
      const priceWithMarkup = Number(p.price) * markup;
      await db.insert(itemsTable).values({
        nameAr: p.name as string,
        nameEn: p.name as string,
        sectionId: Number(sectionId),
        pricePerUnit: priceWithMarkup,
        currencyUnit: guessCurrencyUnit(p.name as string),
        minQuantity: p.qty_values?.min ? Number(p.qty_values.min) : 1,
        apiEndpoint: `${YZ_API}/newOrder/${p.id}/params`,
        apiKey: token,
        isActive: true,
        isAvailable: p.available ?? true,
        sortOrder: 0,
      });
      imported.push(p.name as string);
    } catch (err: any) {
      errors.push(`${p.name}: ${err.detail || err.message}`);
    }
  }

  res.json({ imported: imported.length, errors, names: imported });
});

export default router;
