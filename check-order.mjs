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
  console.log('🔍 Checking latest 5 orders...');
  const res = await pool.query(
    'SELECT id, user_id, item_name, amount, status, notes, updated_at FROM orders ORDER BY id DESC LIMIT 5'
  );
  console.table(res.rows);

  // Also check if any refund transactions were made recently
  console.log('\n💰 Checking latest 5 wallet transactions...');
  const txRes = await pool.query(
    "SELECT id, user_id, type, amount, description, ref_id, created_at FROM wallet_transactions ORDER BY id DESC LIMIT 5"
  );
  console.table(txRes.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
