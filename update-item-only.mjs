import https from 'https';
import http from 'http';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';

const REPO = 'ahmedmuhajir11/alghareeb-card';
const BASE = '/var/www/alghareebcard';

function download(filePath) {
  return new Promise((resolve, reject) => {
    const dest = `${BASE}/${filePath}`;
    mkdirSync(dirname(dest), { recursive: true });
    const url = `https://raw.githubusercontent.com/${REPO}/main/${filePath}?t=${Date.now()}`;
    const file = createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log('✅', filePath); resolve(); });
      } else {
        file.close();
        reject(new Error(`HTTP ${res.statusCode} for ${filePath}`));
      }
    }).on('error', reject);
  });
}

console.log('📥 Downloading updated item.tsx...');
await download('artifacts/alghareeb-card/src/pages/item.tsx');

console.log('\n🔨 Building frontend...');
execSync('BASE_PATH=/ pnpm --filter @workspace/alghareeb-card run build', {
  cwd: BASE, stdio: 'inherit', env: { ...process.env, BASE_PATH: '/' }
});

console.log('\n🔁 Restarting server...');
try {
  execSync('pm2 restart alghareeb-api', { stdio: 'inherit' });
  console.log('✅ Done!');
} catch {
  execSync('pm2 restart all', { stdio: 'inherit' });
  console.log('✅ Done!');
}
