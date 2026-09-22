// One-time migration: add digital_store_hero_title column to dev_settings
// so the admin can rename the "مشاريع شحن رقمية جاهزة" section from the dashboard
// instead of it being hardcoded in the code.
// Safe to run more than once.
// Usage:
//   node lib/db/migrate-digital-store-hero-title.mjs   (DATABASE_URL must be set)
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
    ADD COLUMN IF NOT EXISTS digital_store_hero_title TEXT DEFAULT 'مشاريع شحن رقمية جاهزة'
  `);
  console.log("✅ digital_store_hero_title column is in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
