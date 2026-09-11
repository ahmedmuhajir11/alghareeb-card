import { execSync } from 'child_process';
import pg from './lib/db/node_modules/pg/lib/index.js';
const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const raw = execSync('pm2 jlist', { encoding: 'utf8' });
    const match = raw.match(/"DATABASE_URL"\s*:\s*"([^"]+)"/);
    if (match) dbUrl = match[1];
  } catch {}
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  console.log('🔍 Checking Order #2930 and #2936...');
  const res = await pool.query(
    'SELECT id, user_id, item_name, amount, status, notes, updated_at FROM orders WHERE id IN (2930, 2936)'
  );
  console.table(res.rows);

  // Check wallet transactions for user 28
  console.log('\n💰 Checking refund transactions for user 28...');
  const txRes = await pool.query(
    "SELECT id, user_id, type, amount, description, ref_id, created_at FROM wallet_transactions WHERE user_id = 28 AND type = 'refund' ORDER BY id DESC LIMIT 5"
  );
  console.table(txRes.rows);

  // Check current balance of user 28
  const uRes = await pool.query("SELECT id, username, balance FROM users WHERE id = 28");
  console.log('\n👤 User 28 Balance:', uRes.rows[0]);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
