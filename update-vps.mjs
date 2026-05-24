#!/usr/bin/env node
  import { createWriteStream, mkdirSync, writeFileSync, unlinkSync } from 'fs';
  import { get } from 'https';
  import { dirname } from 'path';
  import { execSync } from 'child_process';
  import { pipeline } from 'stream/promises';

  const TOKEN = process.env.GH_TOKEN;
  const REPO = 'ahmedmuhajir11/alghareeb-card';
  const BASE = '/var/www/alghareebcard';

  const FILES = [
    // DB schema (CRITICAL — Drizzle ignores columns not defined here)
    'lib/db/src/schema/items.ts',
    'lib/db/src/schema/sections.ts',
    'lib/db/src/schema/settings.ts',
    'lib/db/src/schema/user-item-prices.ts',
    'lib/db/src/schema/payment-methods.ts',
    'lib/db/src/schema/index.ts',
    // Generated Zod schemas (must be first so API server build picks them up)
    'lib/api-zod/src/generated/api.ts',
    'lib/api-zod/src/generated/types/updateItemBody.ts',
    'lib/api-zod/src/generated/types/createItemBody.ts',
    'lib/api-zod/src/generated/types/item.ts',
    'lib/api-zod/src/generated/types/itemWithPackages.ts',
    'lib/api-zod/src/generated/types/section.ts',
    'lib/api-zod/src/generated/types/createSectionBody.ts',
    'lib/api-zod/src/generated/types/updateSectionBody.ts',
    'lib/api-zod/src/generated/types/settings.ts',
    'lib/api-zod/src/generated/types/updateSettingsBody.ts',
    'lib/api-zod/src/generated/types/index.ts',
    'lib/api-zod/src/index.ts',
    'lib/api-client-react/src/generated/api.schemas.ts',
    'lib/api-client-react/src/generated/api.ts',
    // Frontend components
    'artifacts/alghareeb-card/src/lib/currency.tsx',
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/SettingsManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/TickerManager.tsx',
    'artifacts/alghareeb-card/src/components/layout/AppLayout.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/PaymentMethodsManager.tsx',
    'artifacts/alghareeb-card/src/components/WelcomeModal.tsx',
    'artifacts/alghareeb-card/src/pages/home.tsx',
    'artifacts/alghareeb-card/src/pages/item.tsx',
    'artifacts/alghareeb-card/src/pages/section.tsx',
    'artifacts/alghareeb-card/src/pages/payment-methods.tsx',
    'artifacts/alghareeb-card/src/pages/level.tsx',
    'artifacts/alghareeb-card/src/pages/wallet.tsx',
    'artifacts/alghareeb-card/src/pages/kyc.tsx',
    'artifacts/alghareeb-card/src/lib/translations.ts',
    'artifacts/alghareeb-card/src/hooks/usePushNotifications.ts',
    'artifacts/alghareeb-card/src/components/PushPermissionBanner.tsx',
    // API server routes
    'artifacts/api-server/src/routes/settings.ts',
    'artifacts/api-server/src/routes/orders-user.ts',
    'artifacts/api-server/src/routes/admin.ts',
    'artifacts/api-server/src/routes/mock-charging.ts',
    'artifacts/api-server/src/routes/sitemap.ts',
    'artifacts/api-server/src/routes/index.ts',
    'artifacts/api-server/src/routes/user-item-prices.ts',
    'artifacts/api-server/src/routes/payment-methods.ts',
    'artifacts/api-server/src/routes/yazancard.ts',
    // Admin dashboard + YazanCard importer
    'artifacts/alghareeb-card/src/components/admin/YazanCardImporter.tsx',
    'artifacts/alghareeb-card/src/pages/admin/dashboard.tsx',
  ];

  function download(filePath) {
    return new Promise((resolve, reject) => {
      const dest = `${BASE}/${filePath}`;
      mkdirSync(dirname(dest), { recursive: true });
      const opts = {
        hostname: 'api.github.com',
        path: `/repos/${REPO}/contents/${filePath}?ref=main`,
        headers: {
          'Authorization': `token ${TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'AlGhareeb-Updater/2.0'
        }
      };
      const file = createWriteStream(dest);
      get(opts, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          get(res.headers.location, res2 => {
            res2.pipe(file);
            file.on('finish', () => { file.close(); console.log('✅', filePath); resolve(); });
          }).on('error', reject);
        } else {
          res.pipe(file);
          file.on('finish', () => { file.close(); console.log('✅', filePath); resolve(); });
        }
      }).on('error', reject);
    });
  }

  console.log('🔄 Downloading updated files...');
  for (const f of FILES) {
    await download(f);
  }

  // ── DB migrations ──────────────────────────────────────────────
  console.log('\n🗄️  Running DB migrations...');
  // ⚠️ Set before running: export YAZANCARD_TOKEN=your_token_here
  const YAZANCARD_TOKEN = process.env.YAZANCARD_TOKEN || 'YAZANCARD_TOKEN_PLACEHOLDER';

  // Write migration script inside lib/db where pg is a direct dependency
  const migratePath = `${BASE}/lib/db/tmp-migrate.cjs`;
  writeFileSync(migratePath, `
'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const YZT = process.env.YAZANCARD_TOKEN || 'YAZANCARD_TOKEN_PLACEHOLDER';
async function run() {
  const c = await pool.connect();
  try {
    await c.query(
      "INSERT INTO items (name_ar, name_en, section_id, is_active, is_available, sort_order, price_per_unit, currency_unit, min_quantity, api_endpoint, api_key) " +
      "VALUES ($1,$2,2,true,true,11,0.035,$3,1000,$4,$5) ON CONFLICT DO NOTHING",
      ['\u0648\u064a\u0648\u064a\u0648', 'Wowo', '\u0630\u0647\u0628',
       'https://api.yazancard.com/client/api/newOrder/274/params', YZT]
    );
    await c.query(
      "INSERT INTO items (name_ar, name_en, section_id, is_active, is_available, sort_order, price_per_unit, currency_unit, min_quantity, api_endpoint, api_key) " +
      "VALUES ($1,$2,2,true,true,12,0.005,$3,10000,$4,$5) ON CONFLICT DO NOTHING",
      ['\u062a\u0627\u0643\u0627', 'Taka', '\u0643\u0648\u064a\u0646\u0632',
       'https://api.yazancard.com/client/api/newOrder/287/params', YZT]
    );
    await c.query(
      "UPDATE items SET api_endpoint=$1, api_key=$2 WHERE name_en ILIKE '%party star%'",
      ['https://api.yazancard.com/client/api/newOrder/145/params', YZT]
    );
    await c.query(
      "UPDATE items SET api_endpoint=$1, api_key=$2, " +
      "price_per_unit=COALESCE(NULLIF(price_per_unit,0),0.035), " +
      "currency_unit=COALESCE(NULLIF(currency_unit,''),$3), " +
      "min_quantity=COALESCE(NULLIF(min_quantity,0),1000) " +
      "WHERE name_en ILIKE '%wowo%' OR name_ar=$4",
      ['https://api.yazancard.com/client/api/newOrder/274/params', YZT,
       '\u0630\u0647\u0628', '\u0648\u064a\u0648\u064a\u0648']
    );
    await c.query(
      "UPDATE items SET api_endpoint=$1, api_key=$2, " +
      "price_per_unit=COALESCE(NULLIF(price_per_unit,0),0.005), " +
      "currency_unit=COALESCE(NULLIF(currency_unit,''),$3), " +
      "min_quantity=COALESCE(NULLIF(min_quantity,0),10000) " +
      "WHERE name_en ILIKE '%taka%' OR name_ar=$4",
      ['https://api.yazancard.com/client/api/newOrder/287/params', YZT,
       '\u0643\u0648\u064a\u0646\u0632', '\u062a\u0627\u0643\u0627']
    );
    // Add tax_percent column if not exists
    await c.query("ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS tax_percent REAL DEFAULT 0");
    console.log('✅ DB migrations done');
  } finally {
    c.release();
    await pool.end();
  }
}
run().catch(e => { console.error('❌ DB migration error:', e.message); process.exit(1); });
`, 'utf8');
  try {
    execSync(`node tmp-migrate.cjs`, {
      cwd: `${BASE}/lib/db`,
      stdio: 'inherit',
    });
  } catch (dbErr) {
    console.warn('⚠️  DB migration skipped (can be done manually via admin panel):', dbErr.message);
  }
  try { unlinkSync(migratePath); } catch {}

  console.log('\n🔨 Building API server...');
  execSync('pnpm --filter @workspace/api-server run build', {
    cwd: BASE, stdio: 'inherit'
  });

  console.log('\n🔨 Building frontend...');
  execSync('BASE_PATH=/ pnpm --filter @workspace/alghareeb-card run build', {
    cwd: BASE, stdio: 'inherit', env: { ...process.env, BASE_PATH: '/' }
  });

  console.log('\n🔁 Restarting API server...');
  try {
    execSync('pm2 restart alghareeb-api', { stdio: 'inherit' });
    console.log('✅ PM2 restarted successfully');
  } catch {
    console.log('⚠️  PM2 restart failed — trying pm2 restart all...');
    try {
      execSync('pm2 restart all', { stdio: 'inherit' });
    } catch {
      console.log('⚠️  Could not restart via PM2. Please run: pm2 restart all');
    }
  }

  console.log('\n✅ Done! All changes applied.');
