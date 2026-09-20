import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

// One row per unique IP ever seen. Aggregated profile + cached geolocation,
// so we don't hit the geolocation API more than once per IP (per cache window).
export const ipAddressesTable = pgTable("ip_addresses", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull().unique(),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 8 }),
  city: varchar("city", { length: 120 }),
  isProxyOrVpn: boolean("is_proxy_or_vpn"), // null = unknown (lookup not done or provider didn't say)
  geoLookedUpAt: timestamp("geo_looked_up_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IpAddressProfile = typeof ipAddressesTable.$inferSelect;
export type InsertIpAddressProfile = typeof ipAddressesTable.$inferInsert;
