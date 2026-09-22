import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const digitalStoreProjectRequestsTable = pgTable("digital_store_project_requests", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new | contacted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DigitalStoreProjectRequest = typeof digitalStoreProjectRequestsTable.$inferSelect;
export type InsertDigitalStoreProjectRequest = typeof digitalStoreProjectRequestsTable.$inferInsert;
