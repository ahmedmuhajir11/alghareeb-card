// One-time migration: add English + Turkish title columns for the three
// standalone homepage cards (websites dev, mobile apps dev, digital store
// projects) so they can be translated like regular sections (name_ar/name_en/name_tr).
// Safe to run more than once.
// Usage:
//   node lib/db/migrate-dev-cards-i18n-titles.mjs   (DATABASE_URL must be set)
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL (or NEON_DATABASE_URL) is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const columns = [
    ["websites_hero_title_en", "'Websites Development'"],
    ["websites_hero_title_tr", "''"],
    ["mobile_apps_hero_title_en", "'Mobile Apps Development'"],
    ["mobile_apps_hero_title_tr", "''"],
    ["digital_store_hero_title_en", "'Ready-Made Digital Top-Up Projects'"],
    ["digital_store_hero_title_tr", "''"],
  ];
  for (const [col, def] of columns) {
    await pool.query(`ALTER TABLE dev_settings ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT ${def}`);
  }
  console.log("✅ English + Turkish title columns are in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
