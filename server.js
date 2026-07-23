import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, Image } from 'canvas';
import crypto from 'crypto';

// Setup global mocks for DOM objects used in processor.js and lut-parser.js
global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return createCanvas(1, 1);
    }
    throw new Error('Unsupported tag: ' + tag);
  }
};
global.Image = Image;
import * as canvasModule from 'canvas';
global.ImageData = canvasModule.ImageData;

// Now we can safely import our frontend logic
import { ImageProcessor } from './js/processor.js';
import './js/lut-parser.js';
const parseCubeLUT = global.parseCubeLUT;
import { PRESETS } from './js/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(express.static(__dirname)); // Serve static files from root

// Ensure data and uploads dirs exist
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve the uploads directory correctly
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer setup (store files in memory temporarily to process them)
const upload = multer({ storage: multer.memoryStorage() });

// --- STYLE A CONFIGURATION ---
// We will use the "Auto Enhance" preset as base, and add a cinematic LUT.
const STYLE_A_PARAMS = {
  ...PRESETS['autoEnhance'].values,
  contrast: 15,
  vibrance: 20
};
let styleALut = null;
const LUT_INTENSITY = 80;

// Load the default LUT on startup
async function initStyleA() {
  try {
    const lutPath = path.join(__dirname, 'luts', 'Azrael 93.CUBE');
    if (fs.existsSync(lutPath)) {
      const text = fs.readFileSync(lutPath, 'utf8');
      styleALut = parseCubeLUT(text);
      console.log('Loaded Style A LUT: Azrael 93');
    } else {
      console.warn('LUT Azrael 93 not found, Style A will proceed without LUT.');
    }
  } catch (err) {
    console.error('Error loading Style A LUT:', err);
  }
}
initStyleA();

const ROOM_STATE_FILE = path.join(DATA_DIR, 'room_state.json');
let roomState = {};
if (fs.existsSync(ROOM_STATE_FILE)) {
  try {
    roomState = JSON.parse(fs.readFileSync(ROOM_STATE_FILE, 'utf8'));
  } catch(e) { console.error('Error loading room state:', e); }
}

function saveRoomState() {
  fs.writeFileSync(ROOM_STATE_FILE, JSON.stringify(roomState, null, 2));
}
let clients = {};

const processor = new ImageProcessor();

// Helper to process an image buffer
async function processImageBuffer(buffer) {
  // Load using node-canvas
  const img = await loadImage(buffer);
  
  // Create original data for processor
  const w = img.width;
  const h = img.height;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const originalData = ctx.getImageData(0, 0, w, h);

  // Process and export
  const dataUrl = processor.exportImage(
    originalData, 
    STYLE_A_PARAMS, 
    'jpeg', 
    92, 
    null, null, 
    styleALut, 
    LUT_INTENSITY
  );

  // Convert Data URL to Buffer
  const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// --- API ENDPOINTS ---

// 1. Upload & Process Images
app.post('/api/sessions/upload', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const sessionId = crypto.randomBytes(8).toString('hex');
    const sessionDir = path.join(UPLOADS_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const processedImages = [];

    console.log(`[Session ${sessionId}] Processing ${req.files.length} images...`);

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`Processing ${file.originalname}...`);
      
      const processedBuffer = await processImageBuffer(file.buffer);
      
      // Save to disk
      const filename = `processed_${i+1}.jpg`;
      const filepath = path.join(sessionDir, filename);
      fs.writeFileSync(filepath, processedBuffer);
      
      processedImages.push(`/uploads/${sessionId}/${filename}`);
    }

    // Generate QR Code pointing to webtool2
    // Assuming the server runs on localhost:3000 for now, or the domain.
    const host = req.headers.host;
    const protocol = req.protocol;
    const sessionUrl = `${protocol}://${host}/webtool2.html?session=${sessionId}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(sessionUrl, { width: 300 });

    console.log(`[Session ${sessionId}] Done.`);

    res.json({
      success: true,
      sessionId,
      sessionUrl,
      qrCodeDataUrl,
      images: processedImages
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get Session Data for Download
app.get('/api/download/:branch/:room/:session', (req, res) => {
  const { branch, room, session } = req.params;
  const sessionDir = path.join(UPLOADS_DIR, branch, room, session);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const files = fs.readdirSync(sessionDir)
                  .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp'));
                  
  const images = files.map(f => `/uploads/${branch}/${room}/${session}/${f}`);

  res.json({
    success: true,
    session,
    images
  });
});


// ==========================================
// NEW FLOW: Branch/Room Sync API
// ==========================================
const ADMIN_FILE = path.join(DATA_DIR, 'admin_data.json');
let ADMIN_DATA = {
  adminPass: "admin123",
  branches: {}
};

if (fs.existsSync(ADMIN_FILE)) {
  try {
    const loadedData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    ADMIN_DATA = { ...ADMIN_DATA, ...loadedData };
    if (!ADMIN_DATA.branches) ADMIN_DATA.branches = {};
    // Normalize rooms to array to prevent forEach/includes errors
    Object.keys(ADMIN_DATA.branches).forEach(bId => {
      const branch = ADMIN_DATA.branches[bId];
      if (branch.rooms && !Array.isArray(branch.rooms)) {
        branch.rooms = typeof branch.rooms === 'object' ? Object.values(branch.rooms) : [branch.rooms];
      }
    });
  } catch(e) { console.error('Error loading admin data:', e); }
} else {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(ADMIN_DATA, null, 2));
}

function saveAdminData() {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(ADMIN_DATA, null, 2));
}

function generateSetupCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// -- Admin APIs --
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_DATA.adminPass) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Sai mật khẩu Admin' });
  }
});

app.get('/api/admin/data', (req, res) => {
  const { auth } = req.query;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  res.json(ADMIN_DATA);
});

app.post('/api/admin/branch', (req, res) => {
  const { auth, branchId, password } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (!branchId || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
  
  if (!ADMIN_DATA.branches[branchId]) {
    ADMIN_DATA.branches[branchId] = { 
      password, 
      setupCode: generateSetupCode(),
      rooms: []
    };
  } else {
    ADMIN_DATA.branches[branchId].password = password;
  }
  saveAdminData();
  res.json({ success: true });
});

app.post('/api/admin/room', (req, res) => {
  const { auth, branchId, roomId } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (!branchId || !roomId) return res.status(400).json({ error: 'Thiếu thông tin' });
  
  if (!ADMIN_DATA.branches[branchId]) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
  
  if (!ADMIN_DATA.branches[branchId].rooms) {
    ADMIN_DATA.branches[branchId].rooms = [];
  }
  if (!ADMIN_DATA.branches[branchId].rooms.includes(roomId)) {
    ADMIN_DATA.branches[branchId].rooms.push(roomId);
    saveAdminData();
    if (clients[branchId]) {
      clients[branchId].forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'init', room: roomId, session: null, images: [] })}\n\n`);
      });
    }
  }
  res.json({ success: true });
});

app.delete('/api/admin/branch/:id', (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  delete ADMIN_DATA.branches[req.params.id];
  saveAdminData();
  res.json({ success: true });
});

app.delete('/api/admin/room/:branch/:room', (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (ADMIN_DATA.branches[req.params.branch] && ADMIN_DATA.branches[req.params.branch].rooms) {
    ADMIN_DATA.branches[req.params.branch].rooms = ADMIN_DATA.branches[req.params.branch].rooms.filter(r => r !== req.params.room);
    saveAdminData();
    if (clients[req.params.branch]) {
      clients[req.params.branch].forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'reset', room: req.params.room })}\n\n`);
      });
    }
  }
  res.json({ success: true });
});

// -- Sync Client API --
app.post('/api/setup-room', (req, res) => {
  const { setupCode } = req.body;
  if (!setupCode) return res.status(400).json({ error: 'Thiếu mã cài đặt' });
  
  let found = null;
  Object.keys(ADMIN_DATA.branches).forEach(bId => {
    if (ADMIN_DATA.branches[bId].setupCode === setupCode) {
      found = { branchId: bId, password: ADMIN_DATA.branches[bId].password };
    }
  });
  
  if (found) {
    // Make sure rooms exists
    if (!ADMIN_DATA.branches[found.branchId].rooms) {
      ADMIN_DATA.branches[found.branchId].rooms = [];
    }
    res.json({ success: true, ...found, rooms: ADMIN_DATA.branches[found.branchId].rooms });
  } else {
    res.status(404).json({ error: 'Mã cài đặt không hợp lệ hoặc đã hết hạn' });
  }
});

app.post('/api/login', (req, res) => {
  const { branchId, password } = req.body;
  
  if (branchId.toLowerCase() === 'cnadmin' && password === ADMIN_DATA.adminPass) {
    return res.json({ success: true, isAdmin: true, auth: password });
  }
  
  if (ADMIN_DATA.branches[branchId] && ADMIN_DATA.branches[branchId].password === password) {
    res.json({ success: true, branchId });
  } else {
    res.status(401).json({ error: 'Sai ID hoặc Mật khẩu' });
  }
});

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
  if (!roomState[branch][room]) roomState[branch][room] = { sessions: [] };
  
  let sessionObj = roomState[branch][room].sessions.find(s => s.id === session);
  if (!sessionObj) {
    sessionObj = { id: session, images: [] };
    roomState[branch][room].sessions.push(sessionObj);
  } else if (sessionObj.finished) {
    sessionObj.finished = false;
  }
  sessionObj.images.push(imageUrl);
  saveRoomState();
  
  // Notify SSE clients
  if (clients[branch]) {
    clients[branch].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'new_image', room, session, imageUrl })}\n\n`);
    });
  }
  
  res.json({ success: true, imageUrl });
});

app.post('/api/finish-session/:branch/:room/:session', (req, res) => {
  const { branch, room, session } = req.params;
  
  if (roomState[branch] && roomState[branch][room]) {
    // Keep session so staff can still see it. Just limit array size to 30.
    const sess = roomState[branch][room].sessions.find(s => s.id === session);
    if (sess) sess.finished = true;
    
    if (roomState[branch][room].sessions.length > 30) {
      roomState[branch][room].sessions = roomState[branch][room].sessions.slice(-30);
    }
    saveRoomState();
  }
  
  if (clients[branch]) {
    clients[branch].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'session_finished', room, session })}\n\n`);
    });
  }
  res.json({ success: true });
});

app.post('/api/sync-state/:branch/:room/:session', express.json(), (req, res) => {
  const { branch, room, session } = req.params;
  const { step, currentTemplate, selectedImages, slots } = req.body;
  
  if (!roomState[branch]) roomState[branch] = {};
  if (!roomState[branch][room]) roomState[branch][room] = { sessions: [] };
  
  let sessionObj = roomState[branch][room].sessions.find(s => s.id === session);
  if (!sessionObj) {
    sessionObj = { id: session, images: [] };
    roomState[branch][room].sessions.push(sessionObj);
  }
  

  if (step !== undefined) sessionObj.step = step;
  if (currentTemplate !== undefined) sessionObj.currentTemplate = currentTemplate;
  
  // SAFEGUARD: Do not accept empty slots or empty selectedImages if we are at step >= 2, 
  // because that means a client accidentally wiped them out.
  const targetStep = sessionObj.step || 1;
  if (selectedImages !== undefined) {
      if (targetStep >= 2 && selectedImages.length === 0 && sessionObj.selectedImages && sessionObj.selectedImages.length > 0) {
          console.log(`[SAFEGUARD] Ignored empty selectedImages sync for session ${session} at step ${targetStep}`);
      } else {
          sessionObj.selectedImages = selectedImages;
      }
  }
  
  if (slots !== undefined) {
      const hasImages = slots.some(s => s.imageId);
      const hadImages = sessionObj.slots && sessionObj.slots.some(s => s.imageId);
      if (targetStep >= 3 && !hasImages && hadImages) {
          console.log(`[SAFEGUARD] Ignored empty slots sync for session ${session} at step ${targetStep}`);
      } else {
          sessionObj.slots = slots;
      }
  }

  
  saveRoomState();
  
  if (clients[branch]) {
    clients[branch].forEach(client => {
      client.write(`data: ${JSON.stringify({ 
        type: 'sync', 
        room, 
        session,
        step: sessionObj.step,
        currentTemplate: sessionObj.currentTemplate,
        selectedImages: sessionObj.selectedImages,
        slots: sessionObj.slots,
        images: sessionObj.images
      })}\n\n`);
    });
  }
  
  res.json({ success: true });
});

app.get('/api/stream/:branch', (req, res) => {
  const { branch } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();
  
  if (!clients[branch]) clients[branch] = [];
  clients[branch].push(res);
  
  // Send current state immediately for ALL rooms configured in this branch or currently active
  const allRooms = new Set();
  const branchData = ADMIN_DATA.branches[branch];
  if (branchData && branchData.rooms) {
    branchData.rooms.forEach(r => allRooms.add(r));
  }
  if (roomState[branch]) {
    Object.keys(roomState[branch]).forEach(r => allRooms.add(r));
  }
  
  allRooms.forEach(room => {
    const state = (roomState[branch] && roomState[branch][room]) || { sessions: [] };
    res.write(`data: ${JSON.stringify({ 
      type: 'init', 
      room: room,
      sessions: (state.sessions || []).filter(s => !s.finished)
    })}\n\n`);
  });
  
  // Keep-alive ping every 15s to prevent Nginx/Cloudflare timeouts
  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 15000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
    clients[branch] = clients[branch].filter(c => c !== res);
  });
});

// ==========================================
// 3. Templates API
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

app.get('/api/templates', (req, res) => {
  if (!fs.existsSync(TEMPLATES_FILE)) {
    return res.json([]);
  }
  try {
    const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch(e) {
    res.status(500).json({ error: 'Cannot read templates' });
  }
});

app.post('/api/templates', (req, res) => {
  // Basic Auth
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer admin123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const templates = req.body;
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Cannot save templates' });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer admin123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!fs.existsSync(TEMPLATES_FILE)) {
      return res.json({ success: true });
    }
    const data = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
    const filtered = data.filter(t => t.id !== req.params.id);
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Cannot delete template' });
  }
});

app.listen(port, () => {
  console.log(`PhotoTune Backend running at http://localhost:${port}`);
  console.log(`Webtool 2 available at http://localhost:${port}/webtool2.html`);
});
