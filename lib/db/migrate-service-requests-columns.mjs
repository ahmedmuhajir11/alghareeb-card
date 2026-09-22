// One-time migration: add service_type + message columns to digital_store_project_requests
// so the same table/admin tab can receive requests from multiple site sections
// (mobile app dev, website dev, salary withdrawal, digital store projects).
// Safe to run more than once.
// Usage:
//   node lib/db/migrate-service-requests-columns.mjs   (DATABASE_URL must be set in the environment)
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
    ALTER TABLE digital_store_project_requests
    ADD COLUMN IF NOT EXISTS service_type VARCHAR(30) NOT NULL DEFAULT 'digital_store_project'
  `);
  await pool.query(`
    ALTER TABLE digital_store_project_requests
    ADD COLUMN IF NOT EXISTS message TEXT
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_digital_store_project_requests_service_type
    ON digital_store_project_requests (service_type)
  `);
  console.log("✅ service_type + message columns are in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
