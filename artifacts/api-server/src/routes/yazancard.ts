import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable, packagesTable, settingsTable } from "@workspace/db";
import { eq, and, sql, or, ilike } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

function stripCategoryPrefix(productName: string, categoryName: string): string {
  const noSpace = (s: string) => s.toLowerCase().replace(/\s/g, "");
  if (noSpace(productName).startsWith(noSpace(categoryName))) {
    const catCharsNeeded = noSpace(categoryName).length;
    let catChars = 0;
    let prodIdx = 0;
    for (; prodIdx < productName.length && catChars < catCharsNeeded; prodIdx++) {
      if (productName[prodIdx] !== " ") catChars++;
    }
    return productName.slice(prodIdx).trim() || productName;
  }
  return productName;
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
  const { products, sectionId, markupPercent = 0, sourceCurrency = "USD", skipDuplicates = true, baseUrl, token } = req.body;

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

  // Resolve exchange rate — convert source currency to USD
  let currencyRate = 1;
  if (sourceCurrency && sourceCurrency !== "USD") {
    const [settings] = await db.select().from(settingsTable).limit(1);
    if (settings) {
      if (sourceCurrency === "TRY") currencyRate = settings.usdToTry ?? 32;
      else if (sourceCurrency === "SYP") currencyRate = (settings as any).usdToSyp ?? 14000;
      else if (sourceCurrency === "EUR") currencyRate = (settings as any).usdToEur ?? 0.93;
    }
  }

  const markup = 1 + Number(markupPercent) / 100;
  const importMode = (req.body.importMode as string) || "flat";
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  if (importMode === "grouped") {
    // ── GROUPED MODE: one item per category, packages per product ──
    const groups: Record<string, any[]> = {};
    for (const p of products) {
      const cat = (p.category_name as string) || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    for (const [categoryName, catProducts] of Object.entries(groups)) {
      try {
        // Find or create the item for this category
        let itemId: number;
        const existingItem = await db.select({ id: itemsTable.id })
          .from(itemsTable)
          .where(and(eq(itemsTable.sectionId, Number(sectionId)), eq(itemsTable.nameEn, categoryName)))
          .limit(1);

        if (existingItem.length > 0) {
          itemId = existingItem[0].id;
        } else {
          const [newItem] = await db.insert(itemsTable).values({
            nameAr: categoryName,
            nameEn: categoryName,
            sectionId: Number(sectionId),
            isActive: true,
            isAvailable: true,
            sortOrder: 0,
          }).returning({ id: itemsTable.id });
          itemId = newItem.id;
          imported.push(categoryName);
        }

        // Create a package per product in this category
        let pkgOrder = 0;
        for (const p of catProducts) {
          const endpoint = `${resolvedBase}/newOrder/${p.id}`;
          const priceUsd = (Number(p.price) / currencyRate) * markup;
          const label = stripCategoryPrefix(p.name as string, categoryName);

          if (skipDuplicates) {
            const existingPkg = await db.select({ id: packagesTable.id })
              .from(packagesTable)
              .where(and(eq(packagesTable.itemId, itemId), eq(packagesTable.apiEndpoint as any, endpoint)))
              .limit(1);
            if (existingPkg.length > 0) { skipped.push(p.name as string); continue; }
          }

          await db.insert(packagesTable).values({
            itemId,
            label,
            quantity: p.qty_values?.min ? Number(p.qty_values.min) : 1,
            priceUsd,
            sortOrder: pkgOrder++,
            isAvailable: p.available ?? true,
            apiEndpoint: endpoint,
            apiKey: resolvedToken,
          } as any);
        }
      } catch (err: any) {
        errors.push(`${categoryName}: ${err.detail || err.message}`);
      }
    }
  } else {
    // ── FLAT MODE: one item per product (original behaviour) ──
    for (const p of products) {
      try {
        const endpoint = `${resolvedBase}/newOrder/${p.id}`;

        if (skipDuplicates) {
          const existing = await db.select({ id: itemsTable.id })
            .from(itemsTable)
            .where(eq(itemsTable.apiEndpoint, endpoint))
            .limit(1);
          if (existing.length > 0) { skipped.push(p.name as string); continue; }
        }

        const priceWithMarkup = (Number(p.price) / currencyRate) * markup;
        await db.insert(itemsTable).values({
          nameAr: p.name as string,
          nameEn: p.name as string,
          sectionId: Number(sectionId),
          pricePerUnit: priceWithMarkup,
          currencyUnit: guessCurrencyUnit(p.name as string),
          minQuantity: p.qty_values?.min ? Number(p.qty_values.min) : 1,
          maxQuantity: p.qty_values?.max ? Number(p.qty_values.max) : null,
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
  }

  res.json({ imported: imported.length, skipped: skipped.length, errors, names: imported });
});

// ─── Sync prices: update existing packages/items prices from provider ───
router.post("/admin/provider/sync-prices", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { baseUrl, token, markupPercent = 0, sourceCurrency = "USD" } = req.body;

  const resolvedToken = (token as string) || process.env.YAZANCARD_TOKEN || "";
  const resolvedBase = normalizeBase((baseUrl as string) || "https://api.yazancard.com/client/api");

  if (!resolvedToken) {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }

  // Fetch all products from provider
  let allProducts: any[] = [];
  try {
    const r = await fetch(`${resolvedBase}/products`, {
      headers: { "Api-Token": resolvedToken },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      res.status(400).json({ error: `API error ${r.status}: ${errText.slice(0, 120)}` });
      return;
    }
    const raw = await r.text();
    let d: any;
    try { d = JSON.parse(raw); } catch {
      res.status(400).json({ error: "الـ API أعاد بيانات غير صالحة (ليست JSON)" });
      return;
    }
    allProducts = Array.isArray(d) ? d : (d.products ?? d.data ?? Object.values(d));
  } catch (err: any) {
    res.status(400).json({ error: `فشل جلب المنتجات: ${err.message}` });
    return;
  }

  // Resolve exchange rate
  let currencyRate = 1;
  if (sourceCurrency && sourceCurrency !== "USD") {
    try {
      const rateRes = await db.select().from(settingsTable).limit(1);
      const s = rateRes[0];
      if (s) {
        if (sourceCurrency === "TRY") currencyRate = s.usdToTry ?? 1;
        else if (sourceCurrency === "SYP") currencyRate = s.usdToSyp ?? 1;
        else if (sourceCurrency === "EUR") currencyRate = s.usdToEur ?? 1;
      }
    } catch { /* use 1 */ }
  }

  const markup = 1 + Number(markupPercent) / 100;
  let updated = 0;
  const updatedNames: string[] = [];
  const errors: string[] = [];

  for (const p of allProducts) {
    try {
      const endpoint = `${resolvedBase}/newOrder/${p.id}`;
      const newPriceUsd = (Number(p.price) / currencyRate) * markup;
      if (!isFinite(newPriceUsd) || newPriceUsd <= 0) continue;

      const productName = (p.name as string) || "";
      let matchedThis = false;

      const isAvailable = p.available !== false;

      // 1) Update matching packages by apiEndpoint (grouped import mode)
      const pkgs = await db.select({ id: packagesTable.id, priceUsd: packagesTable.priceUsd, isAvailable: packagesTable.isAvailable })
        .from(packagesTable)
        .where(sql`${packagesTable}.api_endpoint = ${endpoint}`);
      for (const pkg of pkgs) {
        const priceChanged = Math.abs((pkg.priceUsd ?? 0) - newPriceUsd) > 0.0001;
        const availChanged = (pkg.isAvailable ?? true) !== isAvailable;
        if (priceChanged || availChanged) {
          await db.update(packagesTable)
            .set({ priceUsd: newPriceUsd, isAvailable })
            .where(eq(packagesTable.id, pkg.id));
          updated++;
          matchedThis = true;
          if (productName && !updatedNames.includes(productName)) updatedNames.push(productName);
        } else {
          matchedThis = true; // matched but unchanged — don't count or show
        }
      }

      // 2) Update matching items by apiEndpoint (flat import mode — endpoint stored)
      const itemsByEndpoint = await db.select({ id: itemsTable.id, nameEn: itemsTable.nameEn, nameAr: itemsTable.nameAr, pricePerUnit: itemsTable.pricePerUnit, isAvailable: itemsTable.isAvailable })
        .from(itemsTable)
        .where(eq(itemsTable.apiEndpoint, endpoint));
      for (const item of itemsByEndpoint) {
        const priceChanged = Math.abs((item.pricePerUnit ?? 0) - newPriceUsd) > 0.0001;
        const availChanged = (item.isAvailable ?? true) !== isAvailable;
        if (priceChanged || availChanged) {
          await db.update(itemsTable)
            .set({ pricePerUnit: newPriceUsd, isAvailable })
            .where(eq(itemsTable.id, item.id));
          updated++;
          matchedThis = true;
          const displayName = item.nameAr || item.nameEn || productName;
          if (!updatedNames.includes(displayName)) updatedNames.push(displayName);
        } else {
          matchedThis = true;
        }
      }

      // 3) Fallback: match items by name when no apiEndpoint is stored
      if (!matchedThis && productName) {
        const itemsByName = await db.select({ id: itemsTable.id, nameEn: itemsTable.nameEn, nameAr: itemsTable.nameAr, pricePerUnit: itemsTable.pricePerUnit, isAvailable: itemsTable.isAvailable })
          .from(itemsTable)
          .where(
            and(
              or(ilike(itemsTable.nameEn, productName), ilike(itemsTable.nameAr, productName)),
              sql`(${itemsTable.apiEndpoint} IS NULL OR ${itemsTable.apiEndpoint} = '')`
            )
          );
        for (const item of itemsByName) {
          const priceChanged = Math.abs((item.pricePerUnit ?? 0) - newPriceUsd) > 0.0001;
          const availChanged = (item.isAvailable ?? true) !== isAvailable;
          if (priceChanged || availChanged) {
            await db.update(itemsTable)
              .set({ pricePerUnit: newPriceUsd, isAvailable, apiEndpoint: endpoint })
              .where(eq(itemsTable.id, item.id));
            updated++;
            const displayName = item.nameAr || item.nameEn || productName;
            if (!updatedNames.includes(displayName)) updatedNames.push(displayName);
          } else {
            // Still store the endpoint for faster future lookups
            await db.update(itemsTable).set({ apiEndpoint: endpoint }).where(eq(itemsTable.id, item.id));
          }
        }
      }
    } catch (err: any) {
      errors.push(`${p.name}: ${err.message}`);
    }
  }

  res.json({ updated, total: allProducts.length, updatedNames, errors });
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
        apiEndpoint: `${baseUrl}/newOrder/${p.id}`, apiKey: token,
        isActive: true, isAvailable: p.available ?? true, sortOrder: 0,
      });
      imported.push(p.name as string);
    } catch (err: any) { errors.push(`${p.name}: ${err.detail || err.message}`); }
  }
  res.json({ imported: imported.length, errors, names: imported });
});

export default router;
