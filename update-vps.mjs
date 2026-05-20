#!/usr/bin/env node
  // Auto-update script for AlGhareeb Card
  const https = require('https');
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');

  const FILES = [
    'artifacts/alghareeb-card/src/components/admin/SectionsManager.tsx',
    'artifacts/alghareeb-card/src/components/admin/OrdersManager.tsx',
    'artifacts/api-server/src/routes/orders-user.ts',
    'artifacts/api-server/src/routes/admin.ts',
    'artifacts/api-server/src/routes/mock-charging.ts',
    'artifacts/api-server/src/routes/index.ts',
  ];

  const TOKEN = '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';
  const REPO = 'ahmedmuhajir11/alghareeb-card';
  const BASE = '/var/www/alghareebcard';

  function downloadFile(filePath) {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=main`;
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${REPO}/contents/${filePath}?ref=main`,
        headers: {
          'Authorization': `token ${TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'AlGhareeb-Updater'
        }
      };
      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const fullPath = path.join(BASE, filePath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, data);
          console.log('✅ Updated:', filePath);
          resolve();
        });
      }).on('error', reject);
    });
  }

  async function main() {
    console.log('🔄 Updating files from GitHub...');
    for (const f of FILES) {
      await downloadFile(f);
    }
    console.log('\n🔨 Rebuilding frontend...');
    execSync('BASE_PATH=/ pnpm --filter @workspace/alghareeb-card run build', {
      cwd: BASE, stdio: 'inherit'
    });
    console.log('\n✅ Done! Refresh the admin panel.');
  }

  main().catch(console.error);
  