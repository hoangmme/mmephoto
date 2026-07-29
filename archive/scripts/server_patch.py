import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_api_code = """
// ==========================================
// NEW FLOW: Branch/Room Sync API
// ==========================================
const BRANCHES = {
  "CN01": "llphoto01",
  "CN02": "llphoto02",
  "CN03": "llphoto03",
  "CN04": "llphoto04",
  "CN05": "llphoto05",
  "CN06": "llphoto06"
};

// state: { branchId: { roomId: { session: string, locked: boolean, images: [] } } }
const roomState = {};
// SSE clients: { branch_room: [res, res] }
const clients = {};

app.post('/api/login', (req, res) => {
  const { branchId, password } = req.body;
  if (BRANCHES[branchId] && BRANCHES[branchId] === password) {
    res.json({ success: true, branchId });
  } else {
    res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  }
});

// PC upload single webp photo
app.post('/api/stream-upload/:branch/:room/:session', upload.single('image'), (req, res) => {
  const { branch, room, session } = req.params;
  
  if (!req.file) return res.status(400).json({ error: 'No image' });
  
  const branchDir = path.join(UPLOADS_DIR, branch);
  const roomDir = path.join(branchDir, room);
  const sessionDir = path.join(roomDir, session);
  
  fs.mkdirSync(sessionDir, { recursive: true });
  
  const filename = req.file.originalname;
  const filepath = path.join(sessionDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);
  
  const imageUrl = `/uploads/${branch}/${room}/${session}/${filename}`;
  
  // Update state
  if (!roomState[branch]) roomState[branch] = {};
  if (!roomState[branch][room] || roomState[branch][room].session !== session) {
    roomState[branch][room] = { session, locked: false, images: [] };
  }
  roomState[branch][room].images.push(imageUrl);
  
  // Notify SSE clients
  const roomKey = `${branch}_${room}`;
  if (clients[roomKey]) {
    clients[roomKey].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'new_image', session, imageUrl })}\\n\\n`);
    });
  }
  
  res.json({ success: true, imageUrl });
});

app.post('/api/next-session/:branch/:room', (req, res) => {
  const { branch, room } = req.params;
  
  if (roomState[branch] && roomState[branch][room]) {
    roomState[branch][room].locked = false;
    roomState[branch][room].session = null;
    roomState[branch][room].images = [];
  }
  
  const roomKey = `${branch}_${room}`;
  if (clients[roomKey]) {
    clients[roomKey].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'reset' })}\\n\\n`);
    });
  }
  
  res.json({ success: true });
});

app.get('/api/stream/:branch/:room', (req, res) => {
  const { branch, room } = req.params;
  const roomKey = `${branch}_${room}`;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  if (!clients[roomKey]) clients[roomKey] = [];
  clients[roomKey].push(res);
  
  // Send current state immediately
  if (roomState[branch] && roomState[branch][room] && roomState[branch][room].session) {
     res.write(`data: ${JSON.stringify({ 
       type: 'init', 
       session: roomState[branch][room].session, 
       images: roomState[branch][room].images 
     })}\\n\\n`);
  }
  
  req.on('close', () => {
    clients[roomKey] = clients[roomKey].filter(c => c !== res);
  });
});

// ==========================================
"""

if "// 3. Templates API" in content:
    content = content.replace("// 3. Templates API", new_api_code + "\\n// 3. Templates API")
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched server.js successfully.")
else:
    print("Could not find insertion point.")
