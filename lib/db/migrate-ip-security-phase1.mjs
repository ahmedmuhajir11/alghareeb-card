// One-time migration: create the IP-security tables (Phase 1).
// Purely additive — CREATE TABLE IF NOT EXISTS only. Never touches any
// existing table or column, so it is safe to run even though this database
// has other tables/columns that aren't tracked in the Drizzle schema files
// (do NOT use `drizzle-kit push` on this project — it would try to delete
// those, since it diffs against the schema files, not just add new things).
//
// Usage (from the repo root, with the server's DATABASE_URL available):
//   DATABASE_URL="$(pm2 env 0 | sed -n 's/^DATABASE_URL: *//p')" node lib/db/migrate-ip-security-phase1.mjs
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
    CREATE TABLE IF NOT EXISTS ip_events (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(64) NOT NULL,
      user_id INTEGER,
      event_type VARCHAR(40) NOT NULL,
      success BOOLEAN NOT NULL DEFAULT true,
      order_id INTEGER,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ip_events_ip_idx ON ip_events (ip_address);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ip_events_user_idx ON ip_events (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ip_events_created_idx ON ip_events (created_at);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_addresses (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(64) NOT NULL UNIQUE,
      country VARCHAR(100),
      country_code VARCHAR(8),
      city VARCHAR(120),
      is_proxy_or_vpn BOOLEAN,
      geo_looked_up_at TIMESTAMPTZ,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_bans (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(64) NOT NULL,
      scope VARCHAR(20) NOT NULL DEFAULT 'all',
      reason TEXT,
      banned_by VARCHAR(100) NOT NULL DEFAULT 'admin',
      banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      unbanned_at TIMESTAMPTZ,
      unbanned_by VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(64) NOT NULL UNIQUE,
      reason TEXT,
      added_by VARCHAR(100) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("✅ ip_events, ip_addresses, ip_bans, ip_whitelist are in place.");
  await pool.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
