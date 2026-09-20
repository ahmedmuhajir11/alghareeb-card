import { pgTable, serial, integer, varchar, boolean, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

// One row per security-relevant event (register, login, logout, order, deposit, ...).
// This is the raw audit trail; ipAddressesTable holds the aggregated per-IP profile.
export const ipEventsTable = pgTable("ip_events", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull(),
  userId: integer("user_id"), // nullable: e.g. a failed login before we know who it was
  eventType: varchar("event_type", { length: 40 }).notNull(),
  // register | login | login_failed | logout | order_create | order_create_failed |
  // order_complete | deposit_request
  success: boolean("success").notNull().default(true),
  orderId: integer("order_id"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // small extra context, e.g. { reason: "..." }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ipIdx: index("ip_events_ip_idx").on(table.ipAddress),
  userIdx: index("ip_events_user_idx").on(table.userId),
  createdIdx: index("ip_events_created_idx").on(table.createdAt),
}));

export type IpEvent = typeof ipEventsTable.$inferSelect;
export type InsertIpEvent = typeof ipEventsTable.$inferInsert;
