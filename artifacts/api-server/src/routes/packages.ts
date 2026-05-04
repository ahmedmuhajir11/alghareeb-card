import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, packagesTable } from "@workspace/db";
import {
  ListPackagesParams,
  ListPackagesResponse,
  CreatePackageParams,
  CreatePackageBody,
  UpdatePackageParams,
  UpdatePackageBody,
  UpdatePackageResponse,
  DeletePackageParams,
  DeletePackageResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/items/:itemId/packages", async (req, res): Promise<void> => {
  const params = ListPackagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const packages = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.itemId, params.data.itemId))
      .orderBy(asc(packagesTable.sortOrder), asc(packagesTable.quantity));

    res.json(ListPackagesResponse.parse(serializeRows(packages)));
  } catch (err: any) {
    req.log.error({ err }, "Failed to list packages");
    res.status(500).json({ error: "Failed to list packages" });
  }
});

router.post("/items/:itemId/packages", async (req, res): Promise<void> => {
  const params = CreatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [pkg] = await db
      .insert(packagesTable)
      .values({ ...parsed.data, itemId: params.data.itemId })
      .returning();

    res.status(201).json(serializeRow(pkg));
  } catch (err: any) {
    req.log.error({ err, cause: err?.cause, detail: err?.detail, code: err?.code }, "Failed to create package");
    res.status(500).json({ error: err?.detail || err?.message || "Failed to create package" });
  }
});

router.put("/packages/:id", async (req, res): Promise<void> => {
  const params = UpdatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [pkg] = await db
      .update(packagesTable)
      .set(parsed.data)
      .where(eq(packagesTable.id, params.data.id))
      .returning();

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    res.json(UpdatePackageResponse.parse(serializeRow(pkg)));
  } catch (err: any) {
    req.log.error({ err, detail: err?.detail, code: err?.code }, "Failed to update package");
    res.status(500).json({ error: err?.detail || err?.message || "Failed to update package" });
  }
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const params = DeletePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [pkg] = await db
      .delete(packagesTable)
      .where(eq(packagesTable.id, params.data.id))
      .returning();

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    res.json(DeletePackageResponse.parse({ success: true }));
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete package");
    res.status(500).json({ error: "Failed to delete package" });
  }
});

export default router;
