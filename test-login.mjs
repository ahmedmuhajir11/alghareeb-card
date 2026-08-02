import https from 'https';

function request(url, options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        data: data
      }));
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

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
  
  console.log('Login Response:', res.status, res.data);
  
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) {
    console.log('No cookie received. Incorrect credentials?');
    return;
  }
  
  // Extract cookie
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie:', cookie);
  
  console.log('Disabling maintenance mode...');
  const patchBody = JSON.stringify({ enabled: false });
  const patchRes = await request('https://alghareebcard.com/api/admin/maintenance', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(patchBody),
      'Cookie': cookie
    }
  }, patchBody);
  
  console.log('Maintenance Response:', patchRes.status, patchRes.data);
}

run();
