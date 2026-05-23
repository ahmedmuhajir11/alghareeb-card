#!/usr/bin/env node
  import { createWriteStream, mkdirSync } from 'fs';
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
    'lib/db/src/schema/user-item-prices.ts',
    'lib/db/src/schema/index.ts',
    // Generated Zod schemas (must be first so API server build picks them up)
    'lib/api-zod/src/generated/api.ts',
    'lib/api-zod/src/generated/types/updateItemBody.ts',
    'lib/api-zod/src/generated/types/createItemBody.ts',
    'lib/api-zod/src/generated/types/item.ts',
    'lib/api-zod/src/generated/types/itemWithPackages.ts',
    'lib/api-zod/src/generated/types/index.ts',
    'lib/api-zod/src/index.ts',
    'lib/api-client-react/src/generated/api.schemas.ts',
    'lib/api-client-react/src/generated/api.ts',
    // Frontend components
    'artifacts/alghareeb-card/src/lib/currency.tsx',
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/layout/AppLayout.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/alghareeb-card/src/pages/item.tsx',
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
  // ⚠️ Set this before running: export YAZANCARD_TOKEN=your_token_here
  const YAZANCARD_TOKEN = process.env.YAZANCARD_TOKEN || 'YAZANCARD_TOKEN_PLACEHOLDER';
  const dbScript = `
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    async function run() {
      const client = await pool.connect();
      try {
        // Add ويويو if not exists
        await client.query(\`
          INSERT INTO items (name_ar, name_en, section_id, is_active, is_available, sort_order, price_per_unit, currency_unit, min_quantity, api_endpoint, api_key)
          VALUES ('ويويو', 'Wowo', 2, true, true, 11, 0.035, 'ذهب', 1000,
                  'https://api.yazancard.com/client/api/newOrder/274/params',
                  '${YAZANCARD_TOKEN}')
          ON CONFLICT DO NOTHING
        \`);
        // Add تاكا if not exists
        await client.query(\`
          INSERT INTO items (name_ar, name_en, section_id, is_active, is_available, sort_order, price_per_unit, currency_unit, min_quantity, api_endpoint, api_key)
          VALUES ('تاكا', 'Taka', 2, true, true, 12, 0.005, 'كوينز', 10000,
                  'https://api.yazancard.com/client/api/newOrder/287/params',
                  '${YAZANCARD_TOKEN}')
          ON CONFLICT DO NOTHING
        \`);
        // Set Party Star API fields
        await client.query(\`
          UPDATE items SET
            api_endpoint = 'https://api.yazancard.com/client/api/newOrder/145/params',
            api_key = '${YAZANCARD_TOKEN}'
          WHERE name_en ILIKE '%party star%' OR (section_id = 2 AND name_ar ILIKE '%بارتي%')
        \`);
        // Ensure ويويو and تاكا have correct API fields (if they existed before without them)
        await client.query(\`
          UPDATE items SET
            api_endpoint = 'https://api.yazancard.com/client/api/newOrder/274/params',
            api_key = '${YAZANCARD_TOKEN}',
            price_per_unit = COALESCE(NULLIF(price_per_unit, 0), 0.035),
            currency_unit = COALESCE(NULLIF(currency_unit, ''), 'ذهب'),
            min_quantity = COALESCE(NULLIF(min_quantity, 0), 1000)
          WHERE name_en ILIKE '%wowo%' OR name_ar = 'ويويو'
        \`);
        await client.query(\`
          UPDATE items SET
            api_endpoint = 'https://api.yazancard.com/client/api/newOrder/287/params',
            api_key = '${YAZANCARD_TOKEN}',
            price_per_unit = COALESCE(NULLIF(price_per_unit, 0), 0.005),
            currency_unit = COALESCE(NULLIF(currency_unit, ''), 'كوينز'),
            min_quantity = COALESCE(NULLIF(min_quantity, 0), 10000)
          WHERE name_en ILIKE '%taka%' OR name_ar = 'تاكا'
        \`);
        console.log('✅ DB migrations done');
      } finally {
        client.release();
        await pool.end();
      }
    }
    run().catch(e => { console.error('❌ DB migration error:', e.message); process.exit(1); });
  `;
  execSync(`node -e "${dbScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    cwd: BASE, stdio: 'inherit'
  });

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
