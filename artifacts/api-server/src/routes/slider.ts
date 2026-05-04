import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, sliderImagesTable } from "@workspace/db";
import {
  ListSliderImagesResponse,
  CreateSliderImageBody,
  DeleteSliderImageParams,
  DeleteSliderImageResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

router.get("/slider", async (_req, res): Promise<void> => {
  const images = await db
    .select()
    .from(sliderImagesTable)
    .orderBy(asc(sliderImagesTable.sortOrder), asc(sliderImagesTable.id));

  res.json(ListSliderImagesResponse.parse(serializeRows(images)));
});

router.post("/slider", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSliderImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [image] = await db.insert(sliderImagesTable).values(parsed.data).returning();
  res.status(201).json(serializeRow(image));
});

router.delete("/slider/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteSliderImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [image] = await db
    .delete(sliderImagesTable)
    .where(eq(sliderImagesTable.id, params.data.id))
    .returning();

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json(DeleteSliderImageResponse.parse({ success: true }));
});

export default router;
