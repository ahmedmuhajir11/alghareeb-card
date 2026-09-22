// One-time migration: add digital_store_hero_image column to dev_settings
// so the admin can upload/set a thumbnail image for the "مشاريع شحن رقمية جاهزة"
// homepage card, the same way they already do for the websites/mobile-apps cards.
// Safe to run more than once.
// Usage:
//   node lib/db/migrate-digital-store-hero-image.mjs   (DATABASE_URL must be set)
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL (or NEON_DATABASE_URL) is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  await pool.query(`
    ALTER TABLE dev_settings
    ADD COLUMN IF NOT EXISTS digital_store_hero_image TEXT DEFAULT ''
  `);
  console.log("✅ digital_store_hero_image column is in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
