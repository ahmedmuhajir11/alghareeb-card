import { Router, type IRouter } from "express";
import { or, ilike, asc } from "drizzle-orm";
import { db, itemsTable, sectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { serializeRow } from "../lib/serialize";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 1) {
    res.json({ items: [] });
    return;
  }

  try {
    const rows = await db
      .select({
        id: itemsTable.id,
        nameAr: itemsTable.nameAr,
        nameEn: itemsTable.nameEn,
        logoUrl: itemsTable.logoUrl,
        sectionId: itemsTable.sectionId,
        sectionNameAr: sectionsTable.nameAr,
      })
      .from(itemsTable)
      .leftJoin(sectionsTable, eq(itemsTable.sectionId, sectionsTable.id))
      .where(
        or(
          ilike(itemsTable.nameAr, `%${q}%`),
          ilike(itemsTable.nameEn, `%${q}%`)
        )
      )
      .orderBy(asc(itemsTable.sortOrder), asc(itemsTable.id))
      .limit(20);

    res.json({ items: rows.map(r => serializeRow(r)) });
  } catch (err: any) {
    req.log.error({ err }, "Search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
