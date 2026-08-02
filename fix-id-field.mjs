import https from 'https';
import http from 'http';

// First login to get admin token
function request(urlStr, options, bodyData) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        data: data
      }));
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

// The fixed content to push to server via SSH/API
// Since we can't SSH directly, we'll update the file content via the API if available
// Otherwise we display instructions

async function run() {
  console.log('Logging in...');
  const loginBody = JSON.stringify({ username: 'abuhani', password: 'abohane12345' });
  const res = await request('https://alghareebcard.com/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody)
    }
  }, loginBody);
  
  console.log('Login Response:', res.status);
  const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  
  if (!cookie) {
    console.log('Login failed!');
    return;
  }
  
  console.log('Logged in successfully.');
  console.log('\n===================================================');
  console.log('التعديل المطلوب: تغيير حقل الـ ID ليقبل أي نص');
  console.log('===================================================');
  console.log('\nالملف المطلوب تعديله على الخادم:');
  console.log('/var/www/alghareebcard/artifacts/alghareeb-card/src/pages/item.tsx');
  console.log('\nالسطر القديم (352-354):');
  console.log('  onChange={e => setUserId(e.target.value.replace(/[^0-9]/g, ""))}');
  console.log('  inputMode="numeric"');
  console.log('  pattern="[0-9]*"');
  console.log('\nالسطر الجديد:');
  console.log('  onChange={e => setUserId(e.target.value)}');
  console.log('  inputMode="text"');
  console.log('\nالحل: تحتاج لتشغيل هذا الامر على خادمك VPS');
}

run();
