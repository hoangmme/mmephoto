// ============================================
// MME Color Lab — Print Layout Module
// ============================================
// Independent module for A5 print layout
// Reads processed images from IndexedDB batch

const A5_WIDTH = 1748;
const A5_HEIGHT = 2480;
const PADDING = 40;

const TEMPLATES = {
  '1photo': {
    name: '1 Photo',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: A5_HEIGHT - PADDING * 2 }
    ]
  },
  '2photos': {
    name: '2 Photos',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  },
  '4photos': {
    name: '4 Photos',
    slots: [
      { x: PADDING, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  }
};

let customTemplates = {};

// Convert default TEMPLATES x,y to cx,cy
const parsedDefaults = {};
Object.keys(TEMPLATES).forEach(k => {
  parsedDefaults[k] = {
    name: TEMPLATES[k].name,
    slots: TEMPLATES[k].slots.map(s => ({
      cx: s.x + s.w/2,
      cy: s.y + s.h/2,
      w: s.w,
      h: s.h,
      rotation: 0
    }))
  };
});

const ALL_TEMPLATES = { ...parsedDefaults };

class PrintLayoutApp {
  constructor() {
    this.batchId = null;
    this.images = [];          // Array of { id, name, blob, objectUrl, width, height, createdAt }
    this.selectedImageId = null;
    this.selectedSlotIndex = -1;
    this.currentTemplate = '2photos';

    // Slot state
    this.slots = [];           // Array of { imageId, zoom, panX, panY, assignedAt }

    // Loaded image elements (cached for canvas drawing)
    this._imageCache = {};     // id -> HTMLImageElement

    // Canvas
    this.canvas = document.getElementById('printCanvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM
    this.imageList = document.getElementById('imageList');
    this.imageCount = document.getElementById('imageCount');
    this.templateSlider = document.getElementById('templateSlider');
    this.templateSelect = null; // Removed
    this.slotProps = document.getElementById('slotProps');
    this.exportOverlay = document.getElementById('exportOverlay');

    this.frameImageObj = null;

    // Parse batch ID from URL
    const params = new URLSearchParams(window.location.search);
    this.batchId = params.get('batch');

    this._initApp();
  }

  async _initApp() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const arr = await res.json();
        arr.forEach(t => {
          customTemplates[t.id] = {
            name: t.name || 'Custom Template',
            slots: t.slots.map(s => ({
              cx: s.cx !== undefined ? s.cx : (s.x + s.width/2),
              cy: s.cy !== undefined ? s.cy : (s.y + s.height/2),
              w: s.width || s.w,
              h: s.height || s.h,
              rotation: s.rotation || 0
            })),
            frame_url: t.frame_url,
            canvas_width: t.canvas_width || 1748,
            canvas_height: t.canvas_height || 2480
          };
        });
        Object.assign(ALL_TEMPLATES, customTemplates);
      }
    } catch(e) {
      console.error("Error fetching templates from server", e);
    }

    this._initTemplateSlider();
    this._bindEvents();
    this._initTemplate();
    this._loadBatch();
  }

  _initTemplateSlider() {
    this.templateSlider.innerHTML = '';
    
    Object.keys(ALL_TEMPLATES).forEach(k => {
      const t = ALL_TEMPLATES[k];
      const item = document.createElement('div');
      item.className = 'pl-template-item' + (this.currentTemplate === k ? ' active' : '');
      item.dataset.id = k;
      
      if (t.frame_url) {
        const img = document.createElement('img');
        img.src = t.frame_url;
        item.appendChild(img);
      } else {
        // Draw mini canvas
        const cvs = document.createElement('canvas');
        cvs.width = 174;
        cvs.height = 248;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 174, 248);
        ctx.fillStyle = '#eee';
        t.slots.forEach(s => {
          const w = s.w * 0.1;
          const h = s.h * 0.1;
          const cx = s.cx * 0.1;
          const cy = s.cy * 0.1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(s.rotation || 0);
          ctx.fillRect(-w/2, -h/2, w, h);
          ctx.restore();
        });
        item.appendChild(cvs);
      }
      
      const label = document.createElement('span');
      label.textContent = t.name;
      item.appendChild(label);
      
      item.addEventListener('click', () => {
        if (this.currentTemplate !== k) {
          this.currentTemplate = k;
          this._initTemplateSlider(); // Re-render to update active class
          this._initTemplate();
          this._renderCanvas();
          this._renderImageList();
          this._renderSlotProps();
          
          // Scroll item into view
          item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
      
      this.templateSlider.appendChild(item);
    });
    
    // Set initial currentTemplate if invalid
    if (!ALL_TEMPLATES[this.currentTemplate]) {
      this.currentTemplate = Object.keys(ALL_TEMPLATES)[0];
      this._initTemplateSlider();
    }
  }

  // ── Event Bindings ──
  _bindEvents() {

    document.getElementById('btnSelectAll').addEventListener('click', () => this._selectAll());
    document.getElementById('btnDeselectAll').addEventListener('click', () => this._deselectAll());
    document.getElementById('btnAutoFill').addEventListener('click', () => this._autoFill());

    document.getElementById('btnPrint').addEventListener('click', () => this._print());
    document.getElementById('btnExportJPG').addEventListener('click', () => this._exportJPG());
    document.getElementById('btnExportPDF').addEventListener('click', () => this._exportPDF());

    // Import Custom Template
    const btnImport = document.getElementById('btnImportTemplateJson');
    const inputImport = document.getElementById('templateJsonInput');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', (e) => this._importTemplateJson(e));
    }

    // Canvas click → select slot
    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));

    // Canvas drag for pan
    let isDragging = false, dragStartX, dragStartY, dragSlot;
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      isDragging = true;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      dragSlot = this.selectedSlotIndex;
      this.canvas.style.cursor = 'grabbing';
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const scale = this.canvas.width / this.canvas.offsetWidth;
      const dx = (e.offsetX - dragStartX) * scale;
      const dy = (e.offsetY - dragStartY) * scale;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      this._panSlot(dragSlot, dx, dy);
    });
    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
      this.canvas.style.cursor = '';
    });
    this.canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      this.canvas.style.cursor = '';
    });

    // Touch support for pan
    let touchStartX, touchStartY;
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.selectedSlotIndex < 0) return;
      const touch = e.touches[0];
      const scale = this.canvas.width / this.canvas.offsetWidth;
      const dx = (touch.clientX - touchStartX) * scale;
      const dy = (touch.clientY - touchStartY) * scale;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      this._panSlot(this.selectedSlotIndex, dx, dy);
      e.preventDefault();
    }, { passive: false });
  }

  // ── Load Batch from IndexedDB ──
  async _loadBatch() {
    if (!this.batchId) {
      this.imageList.innerHTML = '<div class="pl-loading">Không tìm thấy batch ID trong URL.</div>';
      return;
    }

    try {
      const db = await this._openDB();
      const tx = db.transaction('batch_images', 'readonly');
      const store = tx.objectStore('batch_images');
      const index = store.index('batchId');
      const request = index.getAll(this.batchId);

      request.onsuccess = async (e) => {
        const records = e.target.result || [];
        if (records.length === 0) {
          this.imageList.innerHTML = '<div class="pl-loading">Batch trống hoặc không tồn tại.</div>';
          return;
        }

        // Convert blobs to object URLs and preload images
        for (const rec of records) {
          const objectUrl = URL.createObjectURL(rec.blob);
          const img = {
            id: rec.imageId,
            name: rec.name,
            blob: rec.blob,
            objectUrl,
            width: rec.width,
            height: rec.height,
            createdAt: rec.createdAt
          };
          this.images.push(img);

          // Preload into image cache
          await this._preloadImage(img.id, objectUrl);
        }

        this.imageCount.textContent = `${this.images.length} ảnh`;
        this._renderImageList();
        this._renderCanvas();
      };

      request.onerror = () => {
        this.imageList.innerHTML = '<div class="pl-loading">Lỗi đọc dữ liệu batch.</div>';
      };
    } catch (err) {
      console.error('Failed to load batch:', err);
      this.imageList.innerHTML = '<div class="pl-loading">Lỗi kết nối IndexedDB.</div>';
    }
  }

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MMEPrintBatches', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'batchId' });
        }
        if (!db.objectStoreNames.contains('batch_images')) {
          const imgStore = db.createObjectStore('batch_images', { keyPath: 'imageId' });
          imgStore.createIndex('batchId', 'batchId', { unique: false });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

  _preloadImage(id, url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._imageCache[id] = img;
        resolve();
      };
      img.onerror = () => resolve(); // Skip broken images
      img.src = url;
    });
  }

  // ── Template ──
  _initTemplate() {
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    
    // Check if we need to load frame image
    this.frameImageObj = null;
    if (tmpl.frame_url) {
      this.frameImageObj = new Image();
      this.frameImageObj.onload = () => this._renderCanvas();
      this.frameImageObj.src = tmpl.frame_url;
    }

    this.slots = tmpl.slots.map(() => ({
      imageId: null,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      assignedAt: null
    }));
    this.selectedSlotIndex = -1;
  }

  // ── Render Image List ──
  _renderImageList() {
    this.imageList.innerHTML = '';
    const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));

    this.images.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      if (img.id === this.selectedImageId) thumb.classList.add('selected');
      if (usedIds.has(img.id)) thumb.classList.add('used');

      thumb.innerHTML = `
        <img src="${img.objectUrl}" alt="${img.name}">
        <div class="pl-thumb-info">${img.name}</div>
      `;

      thumb.addEventListener('click', () => {
        this.selectedImageId = img.id;
        this._renderImageList();

        // If a slot is selected, assign image to it
        if (this.selectedSlotIndex >= 0) {
          this._assignToSlot(this.selectedSlotIndex, img.id);
        }
      });

      this.imageList.appendChild(thumb);
    });
  }

  // ── Canvas Click → Select Slot ──
  _onCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    let clickedSlot = -1;

    for (let i = 0; i < tmpl.slots.length; i++) {
      const s = tmpl.slots[i];
      // Note: Coordinates are un-scaled relative to canvas width/height
      // Convert to local space
      const dx = x - s.cx;
      const dy = y - s.cy;
      const rot = s.rotation || 0;
      const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
      const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);

      if (localX >= -s.w/2 && localX <= s.w/2 && localY >= -s.h/2 && localY <= s.h/2) {
        clickedSlot = i;
        break;
      }
    }

    if (clickedSlot >= 0) {
      this.selectedSlotIndex = clickedSlot;

      // If an image is selected, assign it
      if (this.selectedImageId && !this.slots[clickedSlot].imageId) {
        this._assignToSlot(clickedSlot, this.selectedImageId);
        this.selectedImageId = null;
      }

      this._renderCanvas();
      this._renderSlotProps();
      this._renderImageList();
    }
  }

  // ── Assign Image to Slot ──
  _assignToSlot(slotIndex, imageId) {
    this.slots[slotIndex].imageId = imageId;
    this.slots[slotIndex].zoom = 1.0;
    this.slots[slotIndex].panX = 0;
    this.slots[slotIndex].panY = 0;
    this.slots[slotIndex].assignedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    this.selectedImageId = null;
    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
  }

  // ── Auto Fill ──
  _autoFill() {
    let imgIndex = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].imageId && imgIndex < this.images.length) {
        this._assignToSlot(i, this.images[imgIndex].id);
        imgIndex++;
      }
    }
  }

  _selectAll() {
    // Select all images (visual highlight)
    this.selectedImageId = null;
    this._renderImageList();
  }

  _deselectAll() {
    this.selectedImageId = null;
    this._renderImageList();
  }

  _handleImageUpload(e) {
    const files = e.target.files;
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = 'img_' + Date.now() + '_' + i;
      const url = URL.createObjectURL(file);
      this.images.push({ id, url });
    }

    this._renderImageList();
  }

  // ── Import JSON Template ──
  _importTemplateJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const t = JSON.parse(ev.target.result);
        if (t.id && t.slots) {
          // Add to customTemplates
          customTemplates[t.id] = {
            name: t.name || 'Custom Template',
            slots: t.slots.map(s => ({
              cx: s.cx !== undefined ? s.cx : (s.x + s.width/2),
              cy: s.cy !== undefined ? s.cy : (s.y + s.height/2),
              w: s.width || s.w,
              h: s.height || s.h,
              rotation: s.rotation || 0
            })),
            frame_url: t.frame_url,
            canvas_width: t.canvas_width || 1748,
            canvas_height: t.canvas_height || 2480
          };

          // Update ALL_TEMPLATES in memory for this session
          ALL_TEMPLATES[t.id] = customTemplates[t.id];

          // Reload UI
          this.currentTemplate = t.id;
          this._initTemplateSlider();
          this._initTemplate();
          this._renderCanvas();
        } else {
          alert('File JSON không hợp lệ!');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Canvas Interaction ──
  _panSlot(slotIndex, dx, dy) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.imageId) return;
    
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    const slotDef = tmpl.slots[slotIndex];
    const rot = slotDef.rotation || 0;
    
    // Reverse rotate mouse movement to local coordinates
    const localDx = dx * Math.cos(-rot) - dy * Math.sin(-rot);
    const localDy = dx * Math.sin(-rot) + dy * Math.cos(-rot);

    slot.panX += localDx;
    slot.panY += localDy;
    this._clampPan(slotIndex);
    this._renderCanvas();
  }

  _zoomSlot(slotIndex, zoom) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = Math.max(0.5, Math.min(3.0, zoom));
    this._clampPan(slotIndex);
    this._renderCanvas();
    this._renderSlotProps();
  }

  _resetCrop(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = 1.0;
    slot.panX = 0;
    slot.panY = 0;
    this._renderCanvas();
    this._renderSlotProps();
  }

  _removeFromSlot(slotIndex) {
    this.slots[slotIndex] = { imageId: null, zoom: 1.0, panX: 0, panY: 0, assignedAt: null };
    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
  }

  _clampPan(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.imageId) return;

    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    const slotDef = tmpl.slots[slotIndex];
    const img = this._imageCache[slot.imageId];
    if (!img) return;

    // Calculate cover dimensions
    const { drawW, drawH } = this._calcCover(img.naturalWidth, img.naturalHeight, slotDef.w, slotDef.h, slot.zoom);

    const maxPanX = Math.max(0, (drawW - slotDef.w) / 2);
    const maxPanY = Math.max(0, (drawH - slotDef.h) / 2);

    slot.panX = Math.max(-maxPanX, Math.min(maxPanX, slot.panX));
    slot.panY = Math.max(-maxPanY, Math.min(maxPanY, slot.panY));
  }

  _calcCover(imgW, imgH, slotW, slotH, zoom = 1) {
    const imgRatio = imgW / imgH;
    const slotRatio = slotW / slotH;

    let drawW, drawH;
    if (imgRatio > slotRatio) {
      // Image is wider → fit height
      drawH = slotH * zoom;
      drawW = drawH * imgRatio;
    } else {
      // Image is taller → fit width
      drawW = slotW * zoom;
      drawH = drawW / imgRatio;
    }
    return { drawW, drawH };
  }

  // ── Render Slot Properties Panel ──
  _renderSlotProps() {
    if (this.selectedSlotIndex < 0) {
      this.slotProps.innerHTML = '<div class="pl-no-slot">Chọn một slot trên canvas để chỉnh sửa</div>';
      return;
    }

    const slot = this.slots[this.selectedSlotIndex];
    const slotNum = this.selectedSlotIndex + 1;

    if (!slot.imageId) {
      this.slotProps.innerHTML = `
        <div class="pl-prop-group">
          <span class="pl-prop-label">Slot ${slotNum}</span>
          <div class="pl-prop-value" style="color: var(--pl-text-muted);">Trống — chọn ảnh rồi click slot</div>
        </div>
      `;
      return;
    }

    const img = this.images.find(i => i.id === slot.imageId);
    const zoomPct = Math.round(slot.zoom * 100);

    this.slotProps.innerHTML = `
      <div class="pl-prop-group">
        <span class="pl-prop-label">Slot ${slotNum}</span>
        <div class="pl-prop-value">${img ? img.name : 'Unknown'}</div>
        ${slot.assignedAt ? `<div style="font-size:10px;color:var(--pl-text-muted);">Chọn lúc ${slot.assignedAt}</div>` : ''}
      </div>
      <div class="pl-prop-group">
        <span class="pl-prop-label">Zoom</span>
        <div class="pl-zoom-row">
          <input type="range" id="zoomSlider" min="50" max="300" value="${zoomPct}" step="5">
          <span class="pl-zoom-value">${zoomPct}%</span>
        </div>
      </div>
      <div class="pl-prop-actions">
        <button class="pl-prop-btn" id="btnResetCrop">↺ Reset Crop</button>
        <button class="pl-prop-btn danger" id="btnRemoveSlot">✕ Xóa ảnh khỏi slot</button>
      </div>
    `;

    // Bind zoom
    const zoomSlider = document.getElementById('zoomSlider');
    zoomSlider.addEventListener('input', () => {
      this._zoomSlot(this.selectedSlotIndex, parseInt(zoomSlider.value) / 100);
      this.slotProps.querySelector('.pl-zoom-value').textContent = zoomSlider.value + '%';
    });

    document.getElementById('btnResetCrop').addEventListener('click', () => {
      this._resetCrop(this.selectedSlotIndex);
    });

    document.getElementById('btnRemoveSlot').addEventListener('click', () => {
      this._removeFromSlot(this.selectedSlotIndex);
    });
  }

  // ══════════════════════════════════════
  // Canvas Rendering
  // ══════════════════════════════════════

  _renderCanvas() {
    this._drawToCanvas(this.canvas, true);
  }

  _drawToCanvas(canvas, isPreview) {
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    const w = tmpl.canvas_width || A5_WIDTH;
    const h = tmpl.canvas_height || A5_HEIGHT;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // White background (layer 1)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw slots (layer 2)
    for (let i = 0; i < tmpl.slots.length; i++) {
      const slotDef = tmpl.slots[i];
      const slotData = this.slots[i];

      ctx.save();
      ctx.translate(slotDef.cx, slotDef.cy);
      if (slotDef.rotation) {
        ctx.rotate(slotDef.rotation);
      }

      if (slotData && slotData.imageId && this._imageCache[slotData.imageId]) {
        const img = this._imageCache[slotData.imageId];
        this._drawImageInSlot(ctx, img, slotDef, slotData);
      } else {
        // Empty slot
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);

        // Dashed border
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
        ctx.setLineDash([]);

        // Slot number
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Slot ${i + 1}`, 0, 0);
      }

      // Selection highlight (preview only)
      if (isPreview && i === this.selectedSlotIndex) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(-slotDef.w/2 - 2, -slotDef.h/2 - 2, slotDef.w + 4, slotDef.h + 4);
      }
      
      ctx.restore();
    }

    // Draw Overlay Frame (layer 3)
    if (this.frameImageObj) {
      ctx.drawImage(this.frameImageObj, 0, 0, w, h);
    }
  }

  _drawImageInSlot(ctx, img, slotDef, slotData) {
    const { drawW, drawH } = this._calcCover(
      img.naturalWidth, img.naturalHeight,
      slotDef.w, slotDef.h,
      slotData.zoom
    );

    // Center + pan (relative to local cx,cy origin)
    const drawX = -drawW / 2 + slotData.panX;
    const drawY = -drawH / 2 + slotData.panY;

    // Clip to slot
    ctx.save();
    ctx.beginPath();
    ctx.rect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // ══════════════════════════════════════
  // Export
  // ══════════════════════════════════════

  async _exportJPG() {
    this._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const exportCanvas = document.createElement('canvas');
      this._drawToCanvas(exportCanvas, false);

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `MME_A5_Print_${Date.now()}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export JPG failed:', err);
      alert('Xuất JPG thất bại.');
    }

    this._showOverlay(false);
  }

  async _exportPDF() {
    this._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const exportCanvas = document.createElement('canvas');
      this._drawToCanvas(exportCanvas, false);

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

      // jsPDF: A5 landscape/portrait
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // 148 x 210 mm
      });

      // A5 dimensions in mm
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 148, 210);
      pdf.save(`MME_A5_Print_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export PDF failed:', err);
      alert('Xuất PDF thất bại. Đảm bảo jsPDF đã được tải.');
    }

    this._showOverlay(false);
  }

  _print() {
    // Render full res first
    const exportCanvas = document.createElement('canvas');
    this._drawToCanvas(exportCanvas, false);

    // Replace the preview canvas temporarily
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    this.canvas.width = tmpl.canvas_width || A5_WIDTH;
    this.canvas.height = tmpl.canvas_height || A5_HEIGHT;
    this.ctx.drawImage(exportCanvas, 0, 0);

    window.print();

    // Restore preview
    this._renderCanvas();
  }

  _showOverlay(show) {
    this.exportOverlay.classList.toggle('visible', show);
  }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  window.printApp = new PrintLayoutApp();
});
