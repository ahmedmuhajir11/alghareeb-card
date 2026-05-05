import { pgTable, serial, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";

export const depositRequestsTable = pgTable("deposit_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  paymentMethodName: varchar("payment_method_name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("TRY"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  senderName: varchar("sender_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNote: varchar("admin_note", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DepositRequest = typeof depositRequestsTable.$inferSelect;
export type InsertDepositRequest = typeof depositRequestsTable.$inferInsert;
