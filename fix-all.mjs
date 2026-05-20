#!/usr/bin/env node
  import { execSync } from 'child_process';
  import { createWriteStream, mkdirSync, readFileSync } from 'fs';
  import { get } from 'https';
  import { dirname } from 'path';

  const TOKEN = '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';
  const REPO = 'ahmedmuhajir11/alghareeb-card';
  const BASE = '/var/www/alghareebcard';

  // ── 1. Get DATABASE_URL ──────────────────────────────────────────────────────
  function getDbUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    try {
      const raw = execSync('pm2 env 0 2>/dev/null', { encoding: 'utf8' });
      const match = raw.match(/"DATABASE_URL"\s*:\s*"([^"]+)"/);
      if (match) return match[1];
    } catch {}
    // Try .env file
    try {
      for (const line of readFileSync(`${BASE}/.env`, 'utf8').split('\n')) {
        if (line.startsWith('DATABASE_URL=')) return line.slice(13).trim().replace(/^["']|["']$/g, '');
      }
    } catch {}
    return null;
  }

  const dbUrl = getDbUrl();
  if (!dbUrl) {
    console.error('❌ لم يتم العثور على DATABASE_URL');
    console.error('   شغّل الأمر هكذا: DATABASE_URL="postgresql://..." node /tmp/all.mjs');
    process.exit(1);
  }

  // ── 2. Run DB Migration ──────────────────────────────────────────────────────
  console.log('\n🗄️  Adding missing database columns...');
  const { default: pg } = await import('pg').catch(async () => {
    // Try local node_modules
    const localPg = `${BASE}/node_modules/.pnpm/pg@8.13.3/node_modules/pg/lib/index.js`;
    return { default: (await import(localPg)).default ?? (await import(localPg)) };
  });
  const Client = pg.Client ?? pg;
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const migrations = [
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_endpoint TEXT",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_key TEXT",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_agent_id TEXT",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT",
  ];
  for (const sql of migrations) {
    try { await client.query(sql); console.log('  ✅', sql.split(' ').slice(0,6).join(' ')); }
    catch(e) { console.log('  ⚠️ ', e.message); }
  }
  await client.end();
  console.log('✅ Database migration done');

  // ── 3. Download updated files ────────────────────────────────────────────────
  const FILES = [
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/alghareeb-card/src/pages/item.tsx',
    'artifacts/alghareeb-card/src/hooks/usePushNotifications.ts',
    'artifacts/alghareeb-card/src/components/PushPermissionBanner.tsx',
    'artifacts/api-server/src/routes/orders-user.ts',
    'artifacts/api-server/src/routes/admin.ts',
    'artifacts/api-server/src/routes/mock-charging.ts',
    'artifacts/api-server/src/routes/sitemap.ts',
    'artifacts/api-server/src/routes/index.ts',
  ];

  function download(filePath) {
    return new Promise((resolve, reject) => {
      const dest = `${BASE}/${filePath}`;
      mkdirSync(dirname(dest), { recursive: true });
      const opts = {
        hostname: 'api.github.com',
        path: `/repos/${REPO}/contents/${filePath}?ref=main`,
        headers: { 'Authorization': `token ${TOKEN}`, 'Accept': 'application/vnd.github.v3.raw', 'User-Agent': 'AlGhareeb-Updater/3.0' }
      };
      const file = createWriteStream(dest);
      const handleRes = (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location, handleRes).on('error', reject);
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log('  ✅', filePath.split('/').pop()); resolve(); });
      };
      get(opts, handleRes).on('error', reject);
    });
  }

  console.log('\n📥 Downloading updated files...');
  for (const f of FILES) await download(f);

  // ── 4. Build API server ──────────────────────────────────────────────────────
  console.log('\n🔨 Building API server...');
  execSync('pnpm --filter @workspace/api-server run build', { cwd: BASE, stdio: 'inherit' });

  // ── 5. Build frontend ────────────────────────────────────────────────────────
  console.log('\n🔨 Building frontend...');
  execSync('BASE_PATH=/ pnpm --filter @workspace/alghareeb-card run build', {
    cwd: BASE, stdio: 'inherit', env: { ...process.env, BASE_PATH: '/' }
  });

  // ── 6. Restart PM2 ──────────────────────────────────────────────────────────
  console.log('\n🔁 Restarting API server...');
  try { execSync('pm2 restart alghareeb-api', { stdio: 'inherit' }); }
  catch { try { execSync('pm2 restart all', { stdio: 'inherit' }); } catch {} }

  console.log('\n✅ تم بنجاح! جرّب إرسال الطلب الآن.');
  