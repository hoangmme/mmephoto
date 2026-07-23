const http = require('http');
const fs = require('fs');

async function runTest() {
  const branch = 'CN01';
  const room = 'Room1';
  const session = 'zzzfinal - Copy (2)';

  console.log('1. Creating folder and files...');
  fs.mkdirSync(`uploads/hangkhay/Room1/${session}`, { recursive: true });
  fs.writeFileSync(`uploads/hangkhay/Room1/${session}/1.jpg`, 'mock');
  fs.writeFileSync(`uploads/hangkhay/Room1/${session}/2.jpg`, 'mock');

  await new Promise(r => setTimeout(r, 2000)); // wait for chokidar

  console.log('2. Syncing Step 4 with valid slots...');
  const syncRes = await fetch(`http://localhost:3000/api/sync-state/${encodeURIComponent(branch)}/${encodeURIComponent(room)}/${encodeURIComponent(session)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 4,
      currentTemplate: '2photos',
      selectedImages: ['img1', 'img2'],
      slots: [{ imageId: 'img1' }, { imageId: 'img2' }]
    })
  });
  console.log('Sync response:', await syncRes.json());

  console.log('3. Fetching stream (simulating F5)...');
  const streamReq = http.request(`http://localhost:3000/api/stream/${branch}`, (res) => {
    res.on('data', (chunk) => {
      const data = chunk.toString();
      if (data.includes('type":"init"')) {
        console.log('Received INIT event:', data);
        process.exit(0);
      }
    });
  });
  streamReq.end();
}

runTest().catch(console.error);
