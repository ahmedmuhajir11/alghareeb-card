import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  phoneCode: varchar("phone_code", { length: 10 }),
  country: varchar("country", { length: 100 }),
  currency: varchar("currency", { length: 10 }),
  profileCompleted: boolean("profile_completed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
export type InsertUserProfile = typeof userProfilesTable.$inferInsert;
