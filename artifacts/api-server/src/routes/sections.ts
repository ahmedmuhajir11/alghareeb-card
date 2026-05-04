import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, sectionsTable } from "@workspace/db";
import {
  ListSectionsResponse,
  CreateSectionBody,
  GetSectionParams,
  GetSectionResponse,
  UpdateSectionParams,
  UpdateSectionBody,
  UpdateSectionResponse,
  DeleteSectionParams,
  DeleteSectionResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/sections", async (_req, res): Promise<void> => {
  const sections = await db
    .select()
    .from(sectionsTable)
    .orderBy(asc(sectionsTable.sortOrder), asc(sectionsTable.id));
  res.json(ListSectionsResponse.parse(serializeRows(sections)));
});

router.post("/sections", async (req, res): Promise<void> => {
  const parsed = CreateSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [section] = await db.insert(sectionsTable).values(parsed.data).returning();
  res.status(201).json(GetSectionResponse.parse(serializeRow(section)));
});

router.get("/sections/:id", async (req, res): Promise<void> => {
  const params = GetSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [section] = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.id, params.data.id));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(GetSectionResponse.parse(serializeRow(section)));
});

router.put("/sections/:id", async (req, res): Promise<void> => {
  const params = UpdateSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [section] = await db
    .update(sectionsTable)
    .set(parsed.data)
    .where(eq(sectionsTable.id, params.data.id))
    .returning();

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(UpdateSectionResponse.parse(serializeRow(section)));
});

router.delete("/sections/:id", async (req, res): Promise<void> => {
  const params = DeleteSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [section] = await db
    .delete(sectionsTable)
    .where(eq(sectionsTable.id, params.data.id))
    .returning();

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(DeleteSectionResponse.parse({ success: true }));
});

export default router;
