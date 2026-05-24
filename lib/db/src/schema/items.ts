import { pgTable, serial, text, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectionsTable } from "./sections";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => sectionsTable.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  nameTr: text("name_tr"),
  logoUrl: text("logo_url"),
  currencyUnit: text("currency_unit"),
  pricePerUnit: doublePrecision("price_per_unit"),
  minQuantity: doublePrecision("min_quantity").default(1),
  maxQuantity: doublePrecision("max_quantity"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  apiAgentId: text("api_agent_id"),
  fulfillmentType: text("fulfillment_type").default("auto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, createdAt: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
