import { execSync } from 'child_process';
import pg from './lib/db/node_modules/pg/lib/index.js';
const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;
let envYazanToken = process.env.YAZANCARD_TOKEN || '';

if (!dbUrl || !envYazanToken) {
  try {
    const raw = execSync('pm2 jlist', { encoding: 'utf8' });
    if (!dbUrl) {
      const match = raw.match(/"DATABASE_URL"\s*:\s*"([^"]+)"/);
      if (match) dbUrl = match[1];
    }
    if (!envYazanToken) {
      const matchToken = raw.match(/"YAZANCARD_TOKEN"\s*:\s*"([^"]+)"/);
      if (matchToken) envYazanToken = matchToken[1];
    }
  } catch {}
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  console.log('====================================================');
  console.log('🔍 YazanCard & Pending Orders Diagnostic Tool');
  console.log('====================================================');
  console.log('ENV YAZANCARD_TOKEN:', envYazanToken ? `${envYazanToken.slice(0, 6)}... (length: ${envYazanToken.length})` : 'NOT FOUND IN ENV/PM2');

  // 1. Fetch pending orders
  const pendingRes = await pool.query(
    `SELECT o.id, o.user_id, o.item_name, o.package_name, o.amount, o.status, o.notes, o.created_at,
            i.api_endpoint AS item_ep, i.api_key AS item_key,
            p.api_endpoint AS pkg_ep, p.api_key AS pkg_key
     FROM orders o
     LEFT JOIN items i ON i.name_ar = o.item_name
     LEFT JOIN packages p ON p.label = o.package_name AND p.item_id = i.id
     WHERE o.status = 'pending'
     ORDER BY o.id DESC LIMIT 10`
  );

  console.log(`\n📋 Found ${pendingRes.rows.length} pending order(s):`);
  for (const r of pendingRes.rows) {
    console.log({
      id: r.id,
      item: r.item_name,
      amount: r.amount,
      notes: r.notes,
      item_ep: r.item_ep,
      item_key: r.item_key ? `${r.item_key.slice(0, 6)}...` : 'NONE',
      pkg_ep: r.pkg_ep,
      pkg_key: r.pkg_key ? `${r.pkg_key.slice(0, 6)}...` : 'NONE',
    });
  }

  // 2. Test YazanCard API with different tokens and header configurations
  const tokensToTest = new Set([
    envYazanToken,
    ...pendingRes.rows.map(r => r.pkg_key).filter(Boolean),
    ...pendingRes.rows.map(r => r.item_key).filter(Boolean),
  ]);

  console.log('\n🧪 Testing YazanCard Auth with available tokens:');
  for (const t of tokensToTest) {
    if (!t) continue;
    const cleanT = t.trim();
    console.log(`\n--- Testing Token: "${cleanT.slice(0, 6)}..." (len: ${cleanT.length}) ---`);

    // Test 1: GET /products with "api-token" header
    try {
      const res1 = await fetch('https://api.yazancard.com/client/api/products', {
        headers: { 'api-token': cleanT },
      });
      const text1 = await res1.text().catch(() => '');
      console.log(`  Header "api-token": HTTP ${res1.status} | Body: ${text1.slice(0, 100)}`);
    } catch (e) {
      console.log(`  Header "api-token": Error ${e.message}`);
    }

    // Test 2: GET /products with "Api-Token" header
    try {
      const res2 = await fetch('https://api.yazancard.com/client/api/products', {
        headers: { 'Api-Token': cleanT },
      });
      const text2 = await res2.text().catch(() => '');
      console.log(`  Header "Api-Token": HTTP ${res2.status} | Body: ${text2.slice(0, 100)}`);
    } catch (e) {
      console.log(`  Header "Api-Token": Error ${e.message}`);
    }

    // Test 3: GET /check?orders=ID_219f55948985cf8b
    try {
      const checkUrl = `https://api.yazancard.com/client/api/check?orders=ID_219f55948985cf8b`;
      const res3 = await fetch(checkUrl, {
        headers: { 'api-token': cleanT },
      });
      const text3 = await res3.text().catch(() => '');
      console.log(`  /check with "api-token" header: HTTP ${res3.status} | Body: ${text3.slice(0, 150)}`);
    } catch (e) {
      console.log(`  /check test: Error ${e.message}`);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
