import { pgTable, serial, text, boolean, integer, json, timestamp } from "drizzle-orm/pg-core";

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  flagEmoji: text("flag_emoji").notNull().default("🌍"),
  fields: json("fields").notNull().default([]),
  qrImageUrl: text("qr_image_url"),
  notes: json("notes").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
export type PaymentMethodField = { label: string; value: string; isCopyable: boolean };
