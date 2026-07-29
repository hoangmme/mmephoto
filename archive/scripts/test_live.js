import https from 'https';

function request(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log("Testing POST https://photo.llphotobooth.vn/api/login ...");
  const loginRes = await request('https://photo.llphotobooth.vn/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ branchId: 'hangkhay', password: '123' }));
  console.log("Login Response Status:", loginRes.status);
  console.log("Login Response Body:", loginRes.body);

  console.log("\nTesting GET https://photo.llphotobooth.vn/api/init-state/hangkhay ...");
  const initRes = await request('https://photo.llphotobooth.vn/api/init-state/hangkhay', {
    method: 'GET'
  });
  console.log("Init Response Status:", initRes.status);
  console.log("Init Response Body:", initRes.body);
}

test();
