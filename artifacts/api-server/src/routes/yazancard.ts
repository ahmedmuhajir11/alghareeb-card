import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

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

function normalizeBase(base: string): string {
  const b = base.trim().replace(/\/+$/, "");
  if (!b.startsWith("http")) return `https://${b}`;
  return b;
}

// GET /api/admin/provider/products?baseUrl=...&token=...
// Also keeps backward compat: /api/admin/yazancard/products (uses env token + yazancard base)
router.get("/admin/provider/products", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const token = (req.query.token as string) || process.env.YAZANCARD_TOKEN || "";
  const rawBase = (req.query.baseUrl as string) || "https://api.yazancard.com/client/api";
  const baseUrl = normalizeBase(rawBase);

  if (!token) {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/products`, {
      headers: { "Api-Token": token },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      res.status(502).json({ error: `API error: ${response.status} — تحقق من الـ base URL والتوكن` });
      return;
    }

    const raw = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: "الـ API أعاد استجابة غير صالحة (ليست JSON)" });
      return;
    }

    const products = Array.isArray(data) ? data : Object.values(data);

    const categories: Record<string, unknown[]> = {};
    for (const p of products as any[]) {
      const cat = (p.category_name as string) || "Other";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    }

    res.json({ products, categories, total: products.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy route — backward compat
router.get("/admin/yazancard/products", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const token = process.env.YAZANCARD_TOKEN;
  if (!token) {
    res.status(503).json({ error: "YAZANCARD_TOKEN not configured on server" });
    return;
  }
  const baseUrl = "https://api.yazancard.com/client/api";
  try {
    const response = await fetch(`${baseUrl}/products`, {
      headers: { "Api-Token": token },
      signal: AbortSignal.timeout(15000),
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

// POST /api/admin/provider/import
router.post("/admin/provider/import", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { products, sectionId, markupPercent = 15, priceDivisor = 1, skipDuplicates = true, baseUrl, token } = req.body;

  const resolvedToken = (token as string) || process.env.YAZANCARD_TOKEN || "";
  const resolvedBase = normalizeBase((baseUrl as string) || "https://api.yazancard.com/client/api");

  if (!resolvedToken) {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  if (!Array.isArray(products) || !products.length || !sectionId) {
    res.status(400).json({ error: "products[] و sectionId مطلوبان" });
    return;
  }

  const markup = 1 + Number(markupPercent) / 100;
  const divisor = Math.max(1, Number(priceDivisor) || 1);
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const p of products) {
    try {
      const endpoint = `${resolvedBase}/newOrder/${p.id}/params`;

      if (skipDuplicates) {
        const existing = await db.select({ id: itemsTable.id })
          .from(itemsTable)
          .where(eq(itemsTable.apiEndpoint, endpoint))
          .limit(1);
        if (existing.length > 0) {
          skipped.push(p.name as string);
          continue;
        }
      }

      const priceWithMarkup = (Number(p.price) / divisor) * markup;
      await db.insert(itemsTable).values({
        nameAr: p.name as string,
        nameEn: p.name as string,
        sectionId: Number(sectionId),
        pricePerUnit: priceWithMarkup,
        currencyUnit: guessCurrencyUnit(p.name as string),
        minQuantity: p.qty_values?.min ? Number(p.qty_values.min) : 1,
        apiEndpoint: endpoint,
        apiKey: resolvedToken,
        isActive: true,
        isAvailable: p.available ?? true,
        sortOrder: 0,
      });
      imported.push(p.name as string);
    } catch (err: any) {
      errors.push(`${p.name}: ${err.detail || err.message}`);
    }
  }

  res.json({ imported: imported.length, skipped: skipped.length, errors, names: imported });
});

// Legacy import route
router.post("/admin/yazancard/import", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const token = process.env.YAZANCARD_TOKEN || "";
  const baseUrl = "https://api.yazancard.com/client/api";
  const { products, sectionId, markupPercent = 15 } = req.body;
  if (!token) { res.status(503).json({ error: "YAZANCARD_TOKEN not configured" }); return; }
  if (!Array.isArray(products) || !products.length || !sectionId) {
    res.status(400).json({ error: "products[] و sectionId مطلوبان" }); return;
  }
  const markup = 1 + Number(markupPercent) / 100;
  const imported: string[] = [];
  const errors: string[] = [];
  for (const p of products) {
    try {
      await db.insert(itemsTable).values({
        nameAr: p.name as string, nameEn: p.name as string,
        sectionId: Number(sectionId), pricePerUnit: Number(p.price) * markup,
        currencyUnit: guessCurrencyUnit(p.name as string),
        minQuantity: p.qty_values?.min ? Number(p.qty_values.min) : 1,
        apiEndpoint: `${baseUrl}/newOrder/${p.id}/params`, apiKey: token,
        isActive: true, isAvailable: p.available ?? true, sortOrder: 0,
      });
      imported.push(p.name as string);
    } catch (err: any) { errors.push(`${p.name}: ${err.detail || err.message}`); }
  }
  res.json({ imported: imported.length, errors, names: imported });
});

export default router;
