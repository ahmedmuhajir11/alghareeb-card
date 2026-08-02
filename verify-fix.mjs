import https from 'https';
import { readFileSync } from 'fs';

function request(urlStr, options, bodyData) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function run() {
  // Step 1: Login
  console.log('🔐 تسجيل الدخول...');
  const loginBody = JSON.stringify({ username: 'abuhani', password: 'abohane12345' });
  const loginRes = await request('https://alghareebcard.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);
  
  const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  console.log('Login status:', loginRes.status);
  if (!cookie) { console.log('❌ فشل تسجيل الدخول'); return; }
  console.log('✅ تم تسجيل الدخول');

  // Step 2: Fetch the updated file from GitHub
  console.log('\n📥 جلب الملف المحدّث من GitHub...');
  const ghRes = await request(
    `https://raw.githubusercontent.com/ahmedmuhajir11/alghareeb-card/main/artifacts/alghareeb-card/src/pages/item.tsx?t=${Date.now()}`,
    { method: 'GET' }
  );
  
  if (ghRes.status !== 200) {
    console.log('❌ فشل جلب الملف من GitHub. Status:', ghRes.status);
    return;
  }
  
  const fileContent = ghRes.data;
  
  // Verify the fix is in place
  if (fileContent.includes('[^0-9]')) {
    console.log('⚠️ التعديل لم يُحفظ بعد على GitHub، أو لم يُنشر بعد.');
    return;
  }
  
  if (!fileContent.includes("setUserId(e.target.value)")) {
    console.log('⚠️ لم يتم التحقق من التعديل');
    return;
  }
  
  console.log('✅ تم التحقق من التعديل على GitHub - حقل الـ ID لا يقيد الأحرف الآن');
  
  // Step 3: Try to trigger rebuild via any admin endpoint
  console.log('\n⚙️ الملف محدّث على GitHub.');
  console.log('\n✅ انتهى! الملف تم تحديثه على GitHub.');
  console.log('📌 لتطبيق التغيير على الموقع، يحتاج الخادم لإعادة البناء.');
  console.log('\nنتيجة الفحص:');
  console.log('  - onChange: لا يوجد فلتر [^0-9] ✅');
  console.log('  - الحقل يقبل أي نوع من النص ✅');
}

run().catch(console.error);
