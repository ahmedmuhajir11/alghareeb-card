import { Router, type IRouter, type Request, type Response } from "express";
import { db, sectionsTable, itemsTable } from "@workspace/db";

const router: IRouter = Router();

const BASE_URL = "https://alghareebcard.com";
const TODAY = new Date().toISOString().split("T")[0];

function url(loc: string, priority: string, changefreq: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

router.get("/sitemap.xml", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [sections, items] = await Promise.all([
      db.select({ id: sectionsTable.id }).from(sectionsTable),
      db.select({ id: itemsTable.id, isAvailable: itemsTable.isAvailable }).from(itemsTable),
    ]);

    const staticUrls = [
      url(`${BASE_URL}/`, "1.0", "daily"),
      url(`${BASE_URL}/payment-methods`, "0.8", "weekly"),
      url(`${BASE_URL}/about`, "0.6", "monthly"),
    ];

    const sectionUrls = sections.map(s =>
      url(`${BASE_URL}/section/${s.id}`, "0.9", "daily")
    );

    const itemUrls = items
      .filter(i => i.isAvailable !== false)
      .map(i => url(`${BASE_URL}/item/${i.id}`, "0.8", "weekly"));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...sectionUrls, ...itemUrls].join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch {
    res.status(500).send("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  }
});

router.get("/robots.txt", (_req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /profile-setup
Disallow: /kyc
Disallow: /orders
Disallow: /wallet
Disallow: /my-deposits

Sitemap: ${BASE_URL}/sitemap.xml`);
});

export default router;
