import { Router, type IRouter } from "express";
import { db, settingsTable, pool } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { serializeRow } from "../lib/serialize";
import { requireAdmin } from "../middleware/requireAdmin";
import { sendPushNotification } from "./push";

// Ensure maintenance_mode column exists
pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});

const router: IRouter = Router();

// GET /api/settings/maintenance-status — dedicated ultra-fast maintenance check
router.get("/settings/maintenance-status", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE`);
    const { rows } = await pool.query("SELECT maintenance_mode FROM settings LIMIT 1");
    const enabled = rows.length > 0 ? rows[0].maintenance_mode === true : false;
    res.json({ maintenanceMode: enabled });
  } catch {
    res.json({ maintenanceMode: false });
  }
});

// GET /api/mc — super-simple raw-SQL maintenance check (used by index.html inline script)
router.get("/mc", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE`);
    const { rows } = await pool.query("SELECT maintenance_mode FROM settings LIMIT 1");
    const on = rows.length > 0 ? rows[0].maintenance_mode === true : false;
    res.json({ on });
  } catch {
    res.json({ on: false });
  }
});

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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({}).returning();
    settings = created;
  }
  const row = serializeRow(settings);

  // Overlay product exchange rates from currencies table (usd_rate = product pricing rate)
  try {
    const curRes = await pool.query("SELECT code, usd_rate FROM currencies WHERE is_active = true");
    const fieldMap: Record<string, string> = {
      TRY: "usdToTry", SYP: "usdToSyp", EUR: "usdToEur", OMR: "usdToOmr",
      MAD: "usdToMad", DZD: "usdToDzd", ILS: "usdToIls", IQD: "usdToIqd",
      SAR: "usdToSar", EGP: "usdToEgp", JOD: "usdToJod",
    };
    for (const r of curRes.rows) {
      const field = fieldMap[r.code?.toUpperCase()];
      if (field) row[field] = parseFloat(r.usd_rate) || 0;
    }
  } catch { /* fallback to settings table values */ }

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
  if (row["updatedAt"] == null) row["updatedAt"] = new Date().toISOString();
  if (row["maintenanceMode"] === undefined) {
    try {
      const { rows } = await pool.query("SELECT maintenance_mode FROM settings LIMIT 1");
      if (rows.length > 0) {
        row["maintenanceMode"] = rows[0].maintenance_mode === true;
      }
    } catch {}
  }
  const isMaintenanceOn = row["maintenanceMode"] === true || (row as any).maintenance_mode === true;
  const result = GetSettingsResponse.safeParse(row);
  if (!result.success) {
    res.json({ ...row, id: Number(row["id"] ?? 1), maintenanceMode: isMaintenanceOn });
    return;
  }
  res.json({ ...result.data, maintenanceMode: isMaintenanceOn });
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

// PATCH /api/admin/maintenance — toggle maintenance mode (uses raw SQL only, no drizzle)
router.patch("/admin/maintenance", requireAdmin, async (req, res): Promise<void> => {
  const { enabled } = req.body as { enabled: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) مطلوب" });
    return;
  }

  try {
    // Ensure column exists (idempotent)
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE`);

    // Ensure at least one settings row exists
    const { rows } = await pool.query("SELECT id FROM settings LIMIT 1");
    if (rows.length === 0) {
      await pool.query("INSERT INTO settings DEFAULT VALUES");
    }

    // Update maintenance mode for all rows in settings table
    await pool.query("UPDATE settings SET maintenance_mode = $1", [enabled]);

    if (enabled) {
      sendPushNotification(
        "🔧 الموقع في وضع الصيانة",
        "تم إيقاف الموقع مؤقتًا لإجراء أعمال صيانة، وسيعود للعمل في أقرب وقت ممكن.",
        "/"
      ).catch(() => {});
    } else {
      sendPushNotification(
        "✅ الموقع عاد للعمل",
        "انتهت أعمال الصيانة، يمكنك الآن استخدام الموقع بشكل طبيعي.",
        "/"
      ).catch(() => {});
    }

    res.json({ ok: true, maintenanceMode: enabled });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "خطأ داخلي" });
  }
});

export default router;
