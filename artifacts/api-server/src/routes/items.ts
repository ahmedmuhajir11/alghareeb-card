import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, itemsTable, packagesTable, sectionsTable } from "@workspace/db";
import { sendPushNotification } from "./push";
import {
  ListItemsParams,
  ListItemsResponse,
  CreateItemParams,
  CreateItemBody,
  GetItemParams,
  GetItemResponse,
  UpdateItemParams,
  UpdateItemBody,
  UpdateItemResponse,
  DeleteItemParams,
  DeleteItemResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/sections/:sectionId/items", async (req, res): Promise<void> => {
  const params = ListItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const items = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.sectionId, params.data.sectionId))
      .orderBy(asc(itemsTable.sortOrder), asc(itemsTable.id));

    res.json(ListItemsResponse.parse(serializeRows(items)));
  } catch (err: any) {
    req.log.error({ err, cause: err?.cause }, "Failed to list items");
    res.status(500).json({ error: "Failed to list items" });
  }
});

router.post("/sections/:sectionId/items", async (req, res): Promise<void> => {
  const params = CreateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [item] = await db
      .insert(itemsTable)
      .values({ ...parsed.data, sectionId: params.data.sectionId })
      .returning();

    sendPushNotification(
      "منتج جديد في الغريب كارد 🎮",
      `تم إضافة "${parsed.data.nameAr}" — تفقده الآن!`,
      "/"
    );

    res.status(201).json(serializeRow(item));
  } catch (err: any) {
    req.log.error({ err, cause: err?.cause, detail: err?.detail, code: err?.code }, "Failed to create item");
    res.status(500).json({ error: err?.detail || err?.message || "Failed to create item" });
  }
});

router.get("/items/:id", async (req, res): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const rows = await db
      .select({
        item: itemsTable,
        sectionPricingType: sectionsTable.pricingType,
      })
      .from(itemsTable)
      .leftJoin(sectionsTable, eq(itemsTable.sectionId, sectionsTable.id))
      .where(eq(itemsTable.id, params.data.id));

    if (!rows.length) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const { item, sectionPricingType } = rows[0];

    const packages = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.itemId, item.id))
      .orderBy(asc(packagesTable.sortOrder), asc(packagesTable.quantity));

    const MARKUP = 1.10;

    const serializedItem = serializeRow(item) as Record<string, any>;
    if (serializedItem.pricePerUnit != null) {
      serializedItem.pricePerUnit = +(parseFloat(serializedItem.pricePerUnit) * MARKUP).toFixed(6);
    }

    const markedUpPackages = serializeRows(packages).map((pkg: Record<string, any>) => ({
      ...pkg,
      priceUsd: +(parseFloat(pkg.priceUsd) * MARKUP).toFixed(4),
    }));

    res.json(
      GetItemResponse.parse({
        ...serializedItem,
        sectionPricingType: sectionPricingType ?? "packages",
        packages: markedUpPackages,
      })
    );
  } catch (err: any) {
    req.log.error({ err }, "Failed to get item");
    res.status(500).json({ error: "Failed to get item" });
  }
});

router.put("/items/:id", async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [item] = await db
      .update(itemsTable)
      .set(parsed.data)
      .where(eq(itemsTable.id, params.data.id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json(UpdateItemResponse.parse(serializeRow(item)));
  } catch (err: any) {
    req.log.error({ err, cause: err?.cause, detail: err?.detail, code: err?.code }, "Failed to update item");
    res.status(500).json({ error: err?.detail || err?.message || "Failed to update item" });
  }
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [item] = await db
      .delete(itemsTable)
      .where(eq(itemsTable.id, params.data.id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json(DeleteItemResponse.parse({ success: true }));
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete item");
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
