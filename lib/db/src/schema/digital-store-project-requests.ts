import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const digitalStoreProjectRequestsTable = pgTable("digital_store_project_requests", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new | contacted
  // digital_store_project | mobile_app_dev | website_dev | salary_withdrawal
  serviceType: varchar("service_type", { length: 30 }).notNull().default("digital_store_project"),
  message: text("message"), // free-form summary for request types that collect more than a phone number
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DigitalStoreProjectRequest = typeof digitalStoreProjectRequestsTable.$inferSelect;
export type InsertDigitalStoreProjectRequest = typeof digitalStoreProjectRequestsTable.$inferInsert;
