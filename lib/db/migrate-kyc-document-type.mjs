// One-time migration: add document_type to identity_verifications.
// Safe to run more than once (IF NOT EXISTS / idempotent backfill).
// Usage (from the repo root, with the server's .env available):
//   node --env-file=.env lib/db/migrate-kyc-document-type.mjs
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
    ALTER TABLE identity_verifications
    ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'national_id'
  `);
  console.log("✅ document_type column is in place on identity_verifications.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
