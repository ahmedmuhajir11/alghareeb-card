import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

// Trusted IPs that must never be auto-flagged or banned by mistake
// (e.g. the office, a trusted reseller, shared company networks).
export const ipWhitelistTable = pgTable("ip_whitelist", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull().unique(),
  reason: text("reason"),
  addedBy: varchar("added_by", { length: 100 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IpWhitelistEntry = typeof ipWhitelistTable.$inferSelect;
export type InsertIpWhitelistEntry = typeof ipWhitelistTable.$inferInsert;
