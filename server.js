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
import { parseCubeLUT } from './js/lut-parser.js';
import { PRESETS } from './js/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(express.static(__dirname)); // Serve static files from root

// Ensure uploads dir exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

// 2. Get Session Data
app.get('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  const sessionDir = path.join(UPLOADS_DIR, sessionId);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const files = fs.readdirSync(sessionDir)
                  .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
                  
  const images = files.map(f => `/uploads/${sessionId}/${f}`);

  res.json({
    success: true,
    sessionId,
    images
  });
});

// 3. Templates API
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

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
