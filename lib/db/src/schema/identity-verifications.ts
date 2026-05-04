import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const identityVerificationsTable = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  idNumber: varchar("id_number", { length: 100 }).notNull(),
  extraInfo: varchar("extra_info", { length: 500 }),
  idPhotoFrontUrl: varchar("id_photo_front_url", { length: 500 }),
  selfieUrl: varchar("selfie_url", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNote: varchar("admin_note", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IdentityVerification = typeof identityVerificationsTable.$inferSelect;
export type InsertIdentityVerification = typeof identityVerificationsTable.$inferInsert;
