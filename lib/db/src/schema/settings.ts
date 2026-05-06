import { pgTable, serial, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  marqueeText: text("marquee_text").notNull().default("أقوى العروض والتخفيضات اليومية مستمرة على مدار الساعة - اشحن بسرعة وأمان مع الغريب كارد"),
  usdToTry: doublePrecision("usd_to_try").notNull().default(32.0),
  usdToSyp: doublePrecision("usd_to_syp").notNull().default(13000.0),
  usdToEur: doublePrecision("usd_to_eur").notNull().default(0.92),
  usdToOmr: doublePrecision("usd_to_omr").notNull().default(0.385),
  usdToMad: doublePrecision("usd_to_mad").notNull().default(10.0),
  usdToDzd: doublePrecision("usd_to_dzd").notNull().default(135.0),
  usdToIls: doublePrecision("usd_to_ils").notNull().default(3.7),
  usdToIqd: doublePrecision("usd_to_iqd").notNull().default(1310.0),
  usdToSar: doublePrecision("usd_to_sar").notNull().default(3.75),
  whatsappNumber: text("whatsapp_number").notNull().default("00905378221375"),
  moneyTransferCurrencies: text("money_transfer_currencies").notNull().default("دولار,ليرة تركية,يورو,سوري"),
  welcomeMessage: text("welcome_message").notNull().default("تنبيه هام: قبل إرسال أي مبلغ، تأكد دائماً من بيانات طريقة الدفع الحالية في صفحة (إضافة رصيد). معلومات الدفع قد تتغير في أي وقت، لا ترسل لأي بيانات قديمة محفوظة عندك."),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
