import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const identityVerificationsTable = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  idNumber: varchar("id_number", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }),
  province: varchar("province", { length: 100 }),
  extraInfo: varchar("extra_info", { length: 500 }),
  idPhotoFrontUrl: text("id_photo_front_url"),
  idPhotoBackUrl: text("id_photo_back_url"),
  selfieUrl: text("selfie_url"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNote: varchar("admin_note", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IdentityVerification = typeof identityVerificationsTable.$inferSelect;
export type InsertIdentityVerification = typeof identityVerificationsTable.$inferInsert;
