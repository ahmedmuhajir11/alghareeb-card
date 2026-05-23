import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, paymentMethodsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/payment-methods", async (_req, res): Promise<void> => {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.isActive, true))
    .orderBy(asc(paymentMethodsTable.sortOrder), asc(paymentMethodsTable.id));
  res.json(serializeRows(methods));
});

router.get("/payment-methods/all", async (_req, res): Promise<void> => {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .orderBy(asc(paymentMethodsTable.sortOrder), asc(paymentMethodsTable.id));
  res.json(serializeRows(methods));
});

router.get("/payment-methods/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  if (!method) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeRow(method));
});

router.post("/payment-methods", async (req, res): Promise<void> => {
  const { nameAr, nameEn, nameTr, flagEmoji, fields, qrImageUrl, notes, notesEn, notesTr, isActive, sortOrder, requireSenderName, requireKyc, allowedCurrencies, taxPercent } = req.body;
  if (!nameAr || !nameEn) { res.status(400).json({ error: "nameAr and nameEn required" }); return; }
  const [method] = await db.insert(paymentMethodsTable).values({
    nameAr, nameEn,
    nameTr: nameTr ?? null,
    flagEmoji: flagEmoji ?? "🌍",
    fields: fields ?? [],
    qrImageUrl: qrImageUrl ?? null,
    notes: notes ?? [],
    notesEn: notesEn ?? [],
    notesTr: notesTr ?? [],
    isActive: isActive ?? true,
    sortOrder: sortOrder ?? 0,
    requireSenderName: requireSenderName ?? false,
    requireKyc: requireKyc ?? false,
    allowedCurrencies: allowedCurrencies ?? "",
    taxPercent: taxPercent != null ? parseFloat(taxPercent) : 0,
  }).returning();
  res.status(201).json(serializeRow(method));
});

router.put("/payment-methods/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { nameAr, nameEn, nameTr, flagEmoji, fields, qrImageUrl, notes, notesEn, notesTr, isActive, sortOrder, requireSenderName, requireKyc, allowedCurrencies, taxPercent } = req.body;
  const [method] = await db.update(paymentMethodsTable).set({
    ...(nameAr !== undefined && { nameAr }),
    ...(nameEn !== undefined && { nameEn }),
    ...(nameTr !== undefined && { nameTr }),
    ...(flagEmoji !== undefined && { flagEmoji }),
    ...(fields !== undefined && { fields }),
    ...(qrImageUrl !== undefined && { qrImageUrl }),
    ...(notes !== undefined && { notes }),
    ...(notesEn !== undefined && { notesEn }),
    ...(notesTr !== undefined && { notesTr }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder !== undefined && { sortOrder }),
    ...(requireSenderName !== undefined && { requireSenderName }),
    ...(requireKyc !== undefined && { requireKyc }),
    ...(allowedCurrencies !== undefined && { allowedCurrencies }),
    ...(taxPercent !== undefined && { taxPercent: taxPercent != null ? parseFloat(taxPercent) : 0 }),
  }).where(eq(paymentMethodsTable.id, id)).returning();
  if (!method) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeRow(method));
});

router.delete("/payment-methods/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  res.json({ success: true });
});

export default router;
