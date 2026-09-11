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
  console.log('🔍 Checking Orders #2930, #2927, #2924, #2923...');
  const res = await pool.query(
    'SELECT id, user_id, item_name, amount, status, notes, updated_at FROM orders WHERE id IN (2930, 2927, 2924, 2923) ORDER BY id DESC'
  );
  console.table(res.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
