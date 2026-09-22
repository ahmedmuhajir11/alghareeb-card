// One-time migration: create digital_store_project_requests table.
// Safe to run more than once (CREATE TABLE IF NOT EXISTS).
// Usage (from the repo root, with the server's .env available):
//   node --env-file=.env lib/db/migrate-digital-store-requests.mjs
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
    CREATE TABLE IF NOT EXISTS digital_store_project_requests (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_digital_store_project_requests_status
    ON digital_store_project_requests (status)
  `);
  console.log("✅ digital_store_project_requests table is in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
