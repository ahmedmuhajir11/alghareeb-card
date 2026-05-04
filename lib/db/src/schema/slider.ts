import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sliderImagesTable = pgTable("slider_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSliderImageSchema = createInsertSchema(sliderImagesTable).omit({ id: true, createdAt: true });
export type InsertSliderImage = z.infer<typeof insertSliderImageSchema>;
export type SliderImage = typeof sliderImagesTable.$inferSelect;
