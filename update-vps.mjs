#!/usr/bin/env node
  import { createWriteStream, mkdirSync } from 'fs';
  import { get } from 'https';
  import { dirname } from 'path';
  import { execSync } from 'child_process';
  import { pipeline } from 'stream/promises';

  const TOKEN = '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';
  const REPO = 'ahmedmuhajir11/alghareeb-card';
  const BASE = '/var/www/alghareebcard';

  const FILES = [
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
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/layout/AppLayout.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/alghareeb-card/src/pages/item.tsx',
    'artifacts/alghareeb-card/src/hooks/usePushNotifications.ts',
    'artifacts/alghareeb-card/src/components/PushPermissionBanner.tsx',
    // API server routes
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
  