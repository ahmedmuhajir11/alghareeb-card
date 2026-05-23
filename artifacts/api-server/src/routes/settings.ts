import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { serializeRow } from "../lib/serialize";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

function normalizeMoneyTransferCurrencies(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const list = input
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.slice(0, 40))
    .slice(0, 30);
  const unique = Array.from(new Set(list));
  return unique.join(",");
}

router.get("/settings", async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({}).returning();
    settings = created;
  }
  const row = serializeRow(settings);
  // Coalesce null/undefined number fields to 0
  const numFields = [
    "usdToTry","usdToSyp","usdToEur","usdToOmr","usdToMad",
    "usdToDzd","usdToIls","usdToIqd","usdToSar","usdToEgp","usdToJod",
  ] as const;
  for (const f of numFields) {
    if (row[f] == null || isNaN(Number(row[f]))) row[f] = 0;
  }
  // Coalesce null/undefined string fields to empty string
  const strFields = [
    "marqueeText","marqueeTextEn","marqueeTextTr",
    "whatsappNumber","moneyTransferCurrencies",
    "welcomeMessage","welcomeMessageEn","welcomeMessageTr",
  ] as const;
  for (const f of strFields) {
    if (row[f] == null) row[f] = "";
  }
  // updatedAt must be a string
  if (row["updatedAt"] == null) row["updatedAt"] = new Date().toISOString();
  const result = GetSettingsResponse.safeParse(row);
  if (!result.success) {
    res.json({ ...row, id: Number(row["id"] ?? 1) });
    return;
  }
  res.json(result.data);
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.moneyTransferCurrencies !== undefined) {
    data.moneyTransferCurrencies = normalizeMoneyTransferCurrencies(data.moneyTransferCurrencies);
  }

  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(settingsTable).values(data as any).returning();
    res.json(UpdateSettingsResponse.parse(serializeRow(created)));
    return;
  }

  const [updated] = await db.update(settingsTable).set(data as any).returning();
  const updRow = serializeRow(updated);
  const numFields2 = [
    "usdToTry","usdToSyp","usdToEur","usdToOmr","usdToMad",
    "usdToDzd","usdToIls","usdToIqd","usdToSar","usdToEgp","usdToJod",
  ] as const;
  for (const f of numFields2) {
    if (updRow[f] == null || isNaN(Number(updRow[f]))) updRow[f] = 0;
  }
  const strFields2 = [
    "marqueeText","marqueeTextEn","marqueeTextTr",
    "whatsappNumber","moneyTransferCurrencies",
    "welcomeMessage","welcomeMessageEn","welcomeMessageTr",
  ] as const;
  for (const f of strFields2) { if (updRow[f] == null) updRow[f] = ""; }
  if (updRow["updatedAt"] == null) updRow["updatedAt"] = new Date().toISOString();
  const putResult = UpdateSettingsResponse.safeParse(updRow);
  if (!putResult.success) {
    res.json({ ...updRow, id: Number(updRow["id"] ?? 1) });
    return;
  }
  res.json(putResult.data);
});

export default router;
