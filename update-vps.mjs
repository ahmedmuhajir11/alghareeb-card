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
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/alghareeb-card/src/pages/item.tsx',
    'artifacts/alghareeb-card/src/hooks/usePushNotifications.ts',
    'artifacts/alghareeb-card/src/components/PushPermissionBanner.tsx',
    'artifacts/api-server/src/routes/orders-user.ts',
    'artifacts/api-server/src/routes/admin.ts',
    'artifacts/api-server/src/routes/mock-charging.ts',
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

  console.log('\n🔨 Building frontend...');
  execSync('BASE_PATH=/ pnpm --filter @workspace/alghareeb-card run build', {
    cwd: BASE, stdio: 'inherit', env: { ...process.env, BASE_PATH: '/' }
  });

  console.log('\n✅ Done! Refresh the admin panel to see API fields.');
  