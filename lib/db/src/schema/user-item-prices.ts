import { pgTable, serial, doublePrecision, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { itemsTable } from "./items";

export const userItemPricesTable = pgTable("user_item_prices", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 8 }).notNull(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "cascade" }),
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.accountNumber, t.itemId)]);
