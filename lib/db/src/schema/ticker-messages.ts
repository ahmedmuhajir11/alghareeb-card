import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const tickerMessagesTable = pgTable("ticker_messages", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TickerMessage = typeof tickerMessagesTable.$inferSelect;
export type InsertTickerMessage = typeof tickerMessagesTable.$inferInsert;
