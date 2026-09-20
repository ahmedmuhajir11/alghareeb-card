import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

// A ban is a row here; unbanning sets unbannedAt instead of deleting, so history
// is preserved ("سبب الحظر، تاريخ الحظر، المسؤول..."). The IP is considered
// currently banned (for a given scope) if a row exists with unbannedAt IS NULL
// and scope matching ('all' or the specific operation).
export const ipBansTable = pgTable("ip_bans", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull().default("all"), // all | login | register | orders
  reason: text("reason"),
  bannedBy: varchar("banned_by", { length: 100 }).notNull().default("admin"),
  bannedAt: timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),
  unbannedAt: timestamp("unbanned_at", { withTimezone: true }),
  unbannedBy: varchar("unbanned_by", { length: 100 }),
});

export type IpBan = typeof ipBansTable.$inferSelect;
export type InsertIpBan = typeof ipBansTable.$inferInsert;
