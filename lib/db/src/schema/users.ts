import { pgTable, serial, varchar, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 50 }),
  phoneCode: varchar("phone_code", { length: 10 }),
  country: varchar("country", { length: 100 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }).unique(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("TRY"),
  level: varchar("level", { length: 50 }).notNull().default("عادي"),
  isVerified: boolean("is_verified").notNull().default(false),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
