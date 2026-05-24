'use strict';
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const q = async (sql) => { await p.query(sql); console.log('OK:', sql.slice(0,60)); };
  await q("ALTER TABLE sections ADD COLUMN IF NOT EXISTS name_tr text");
  await q("ALTER TABLE items ADD COLUMN IF NOT EXISTS name_tr text");
  await q("ALTER TABLE settings ADD COLUMN IF NOT EXISTS marquee_text_en text NOT NULL DEFAULT ''");
  await q("ALTER TABLE settings ADD COLUMN IF NOT EXISTS marquee_text_tr text NOT NULL DEFAULT ''");
  await q("ALTER TABLE settings ADD COLUMN IF NOT EXISTS welcome_message_tr text NOT NULL DEFAULT ''");
  await q("ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS notes_en text[] NOT NULL DEFAULT '{}'");
  await q("ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS notes_tr text[] NOT NULL DEFAULT '{}'");
  await q("ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS tax_percent REAL DEFAULT 0");
  console.log('\n✅ Done!');
  await p.end();
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
