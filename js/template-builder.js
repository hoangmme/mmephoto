// ============================================
// MME Color Lab — Admin Template Builder
// ============================================

const DEFAULT_MAGIC_COLORS = ['#01bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d', '#ff751f'];

class TemplateBuilderApp {
  constructor() {
    this.adminToken = sessionStorage.getItem('tb_admin_token');
    
    if (!this.adminToken) {
      this._initLoginUI();
      return;
    }

    this._initApp();
  }

  _initLoginUI() {
    const btnLogin = document.getElementById('btnLogin');
    const inputPass = document.getElementById('adminPassword');
    
    btnLogin.addEventListener('click', () => {
      const pass = inputPass.value;
      if (pass === 'admin123') { // Simple default password
        sessionStorage.setItem('tb_admin_token', 'Bearer ' + pass);
        this.adminToken = 'Bearer ' + pass;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appContent').style.display = 'flex';
        this._initApp();
      } else {
        alert('Mật khẩu không đúng!');
      }
    });

    inputPass.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') btnLogin.click();
    });
  }

  async _initApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContent').style.display = 'flex';

    this.template = {
      id: 'tpl_' + Date.now(),
      name: '',
      canvas_width: 1748,
      canvas_height: 2480,
      frame_url: '',
      slots: []
    };
    
    this.magicColors = [...DEFAULT_MAGIC_COLORS];
    this.scale = 0.25;

    this._cacheDOM();
    this._bindEvents();
    this._renderWorkspace();
    this._renderSlotsList();

    // Fetch existing templates from server to be aware of them
    try {
      const res = await fetch('/api/templates');
      this.serverTemplates = await res.json();
    } catch(e) {
      this.serverTemplates = [];
    }

    this._renderServerTemplates();
  }

  _cacheDOM() {
    this.tplNameInput = document.getElementById('tplName');
    this.paperSizeSelect = document.getElementById('paperSize');
    this.canvasWInput = document.getElementById('canvasW');
    this.canvasHInput = document.getElementById('canvasH');
    
    this.frameInput = document.getElementById('frameInput');
    this.btnUploadFrame = document.getElementById('btnUploadFrame');
    this.framePreview = document.getElementById('framePreview');
    this.frameImg = document.getElementById('frameImg');
    this.btnRemoveFrame = document.getElementById('btnRemoveFrame');
    
    this.slotsList = document.getElementById('slotsList');
    this.btnAddSlot = document.getElementById('btnAddSlot');
    this.btnAutoScan = document.getElementById('btnAutoScan');

    this.serverTemplateList = document.getElementById('serverTemplateList');
    this.slotsList = document.getElementById('slotsList');
    
    // Workspace
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.slotsLayer = document.getElementById('slotsLayer');
    this.workspaceFrameImg = document.getElementById('workspaceFrameImg');
    
    // Zoom
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    
    // Header actions
    this.btnNewTemplate = document.getElementById('btnNewTemplate');
    this.btnSaveTemplate = document.getElementById('btnSaveTemplate');
    this.btnExportJson = document.getElementById('btnExportJson');
    this.btnImportJson = document.getElementById('btnImportJson');
    this.jsonInput = document.getElementById('jsonInput');
  }

  _bindEvents() {
    // Basic settings
    this.tplNameInput.addEventListener('input', (e) => this.template.name = e.target.value);
    
    if (this.paperSizeSelect) {
      this.paperSizeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.template.paper_size = val;
        if (val === 'A4') {
          this.canvasWInput.value = 2480;
          this.canvasHInput.value = 3508;
          this.template.canvas_width = 2480;
          this.template.canvas_height = 3508;
        } else {
          this.canvasWInput.value = 1748;
          this.canvasHInput.value = 2480;
          this.template.canvas_width = 1748;
          this.template.canvas_height = 2480;
        }
        this._renderWorkspace();
      });
    }

    this.canvasWInput.addEventListener('change', (e) => {
      this.template.canvas_width = parseInt(e.target.value) || 1748;
      this._renderWorkspace();
    });
    this.canvasHInput.addEventListener('change', (e) => {
      this.template.canvas_height = parseInt(e.target.value) || 2480;
      this._renderWorkspace();
    });

    // Frame Upload
    this.btnUploadFrame.addEventListener('click', () => this.frameInput.click());
    this.frameInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.template.frame_url = ev.target.result;
        // Do not clear slots, just update frame
        this._updateFrameUI();
        this._renderWorkspace();
      };
      reader.readAsDataURL(file);
    });
    this.btnRemoveFrame.addEventListener('click', () => {
      this.template.frame_url = '';
      this.frameInput.value = '';
      this._updateFrameUI();
      this._renderWorkspace();
    });

    // Slot Management
    if (this.btnAddSlot) {
      this.btnAddSlot.addEventListener('click', () => {
        const nextColor = DEFAULT_MAGIC_COLORS[this.template.slots.length % DEFAULT_MAGIC_COLORS.length];
        this.template.slots.push({
          id: 'slot_' + Date.now().toString().slice(-6),
          color: nextColor,
          cx: 0,
          cy: 0,
          w: 600,
          h: 800,
          rotation: 0
        });
        this._renderSlotsList();
        this._renderWorkspace();
      });
    }

    // Auto Scan
    this.btnAutoScan.addEventListener('click', () => this._autoScanAndPunch());

    // Zoom
    this.btnZoomIn.addEventListener('click', () => this._setZoom(this.scale + 0.1));
    this.btnZoomOut.addEventListener('click', () => this._setZoom(this.scale - 0.1));

    // Header actions
    this.btnNewTemplate.addEventListener('click', () => {
      if(confirm('Bạn có muốn tạo Template mới không? Các thay đổi chưa lưu sẽ bị mất.')) {
        this._createNewTemplate();
      }
    });
    this.btnSaveTemplate.addEventListener('click', () => this._saveToServer());
    this.btnExportJson.addEventListener('click', () => this._exportJson());
    this.btnImportJson.addEventListener('click', () => document.getElementById('jsonInput').click());
    this.jsonInput.addEventListener('change', this._importJson.bind(this));
  }

  // ── Frame UI ──
  _updateFrameUI() {
    if (this.template.frame_url) {
      this.frameImg.src = this.template.frame_url;
      this.framePreview.style.display = 'block';
      this.btnUploadFrame.style.display = 'none';
      
      this.workspaceFrameImg.src = this.template.frame_url;
      this.workspaceFrameImg.style.display = 'block';
    } else {
      this.framePreview.style.display = 'none';
      this.btnUploadFrame.style.display = 'block';
      this.workspaceFrameImg.style.display = 'none';
    }
  }

  // ── Workspace & Zoom ──
  _setZoom(newScale) {
    this.scale = Math.max(0.1, Math.min(2.0, newScale));
    this.canvasWrapper.style.transform = `scale(${this.scale})`;
  }

  _renderWorkspace() {
    this.canvasWrapper.style.width = this.template.canvas_width + 'px';
    this.canvasWrapper.style.height = this.template.canvas_height + 'px';
    this.canvasWrapper.style.transform = `scale(${this.scale})`;
    
    this.slotsLayer.innerHTML = '';
    
    this.template.slots.forEach((slot, index) => {
      const el = document.createElement('div');
      el.className = 'tb-visual-slot active';
      
      const left = slot.cx - slot.w / 2;
      const top = slot.cy - slot.h / 2;
      
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.width = slot.w + 'px';
      el.style.height = slot.h + 'px';
      el.style.pointerEvents = 'none';
      el.style.zIndex = index + 1;
      
      const rotDeg = (slot.rotation || 0) * (180 / Math.PI);
      el.style.transform = `rotate(${rotDeg}deg)`;
      
      if (slot.clipPath) {
        el.style.border = 'none';
        el.style.backgroundColor = 'transparent';
        el.innerHTML = `
          <svg width="${slot.w}" height="${slot.h}" viewBox="${-slot.w/2} ${-slot.h/2} ${slot.w} ${slot.h}" style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:visible; pointer-events:none;">
            <path d="${slot.clipPath}" fill="${slot.color}33" stroke="${slot.color}" stroke-width="4" stroke-dasharray="10 5" />
          </svg>
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:${slot.color}; font-weight:bold; font-size:24px;">S${index + 1}</div>
        `;
      } else {
        el.style.borderColor = slot.color;
        el.style.backgroundColor = slot.color + '33';
        el.innerHTML = `<span style="color:${slot.color}; font-weight:bold; font-size:24px;">S${index + 1}</span>`;
      }
      this.slotsLayer.appendChild(el);
    });
  }

  // ── Auto Scan with PCA ──
  _hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  _calculatePCA(pixels) {
    if (pixels.length === 0) return null;
    let sumX = 0, sumY = 0;
    for (let p of pixels) { sumX += p.x; sumY += p.y; }
    const cx = sumX / pixels.length;
    const cy = sumY / pixels.length;

    let m20 = 0, m02 = 0, m11 = 0;
    for (let p of pixels) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      m20 += dx * dx;
      m02 += dy * dy;
      m11 += dx * dy;
    }
    m20 /= pixels.length;
    m02 /= pixels.length;
    m11 /= pixels.length;

    let theta = 0.5 * Math.atan2(2 * m11, m20 - m02);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);
    for (let p of pixels) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const rx = dx * cosT - dy * sinT;
      const ry = dx * sinT + dy * cosT;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    let w = maxX - minX;
    let h = maxY - minY;

    while (theta > Math.PI / 4) {
      theta -= Math.PI / 2;
      let temp = w; w = h; h = temp;
    }
    while (theta < -Math.PI / 4) {
      theta += Math.PI / 2;
      let temp = w; w = h; h = temp;
    }

    return { cx, cy, w, h, rotation: theta };
  }

  // ── Custom Clip Path Generation (Contour Tracing) ──
  _generateClipPath(pixels, cx, cy) {
    if (pixels.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let p of pixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    minX -= 1; minY -= 1;
    maxX += 1; maxY += 1;
    
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const grid = new Uint8Array(bw * bh);
    
    let startX = -1, startY = -1;
    for (let p of pixels) {
      const lx = p.x - minX;
      const ly = p.y - minY;
      grid[ly * bw + lx] = 1;
    }
    
    outer: for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        if (grid[y * bw + x]) {
          startX = x; startY = y;
          break outer;
        }
      }
    }
    
    if (startX === -1) return null;
    
    const boundary = [];
    const dirs = [
      {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
      {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
    ];
    
    let p = {x: startX, y: startY};
    let backtrack = 7; 
    let attempts = 0;
    
    do {
      boundary.push({x: p.x + minX, y: p.y + minY}); 
      let found = false;
      let b = (backtrack + 2) % 8;
      for (let i = 0; i < 8; i++) {
        let dir = dirs[(b + i) % 8];
        let nx = p.x + dir.x;
        let ny = p.y + dir.y;
        if (nx >= 0 && nx < bw && ny >= 0 && ny < bh && grid[ny * bw + nx]) {
          p = {x: nx, y: ny};
          backtrack = (b + i + 4) % 8;
          found = true;
          break;
        }
      }
      if (!found) break;
      attempts++;
    } while ((p.x !== startX || p.y !== startY) && attempts < pixels.length * 4);
    
    const simplified = this._simplifyPath(boundary, 2.5); // epsilon
    
    if (simplified.length < 3) return null;
    
    let pathStr = '';
    for (let i = 0; i < simplified.length; i++) {
      const rx = (simplified[i].x - cx).toFixed(1);
      const ry = (simplified[i].y - cy).toFixed(1);
      if (i === 0) pathStr += `M ${rx} ${ry} `;
      else pathStr += `L ${rx} ${ry} `;
    }
    pathStr += 'Z';
    return pathStr;
  }

  _simplifyPath(points, epsilon) {
    if (points.length <= 2) return points;
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;
    for (let i = 1; i < end; i++) {
      let d = this._perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }
    if (dmax > epsilon) {
      let recResults1 = this._simplifyPath(points.slice(0, index + 1), epsilon);
      let recResults2 = this._simplifyPath(points.slice(index), epsilon);
      return recResults1.slice(0, -1).concat(recResults2);
    } else {
      return [points[0], points[end]];
    }
  }

  _perpendicularDistance(p, p1, p2) {
    const num = Math.abs((p2.y - p1.y) * p.x - (p2.x - p1.x) * p.y + p2.x * p1.y - p2.y * p1.x);
    const den = Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));
    return den === 0 ? 0 : num / den;
  }

  _autoScanAndPunch() {
    if (!this.template.frame_url) {
      alert("Vui lòng tải lên ảnh khung trước!");
      return;
    }

    this.btnAutoScan.textContent = 'Đang quét...';
    this.btnAutoScan.disabled = true;

    const img = new Image();
    img.onload = () => {
      const w = this.template.canvas_width;
      const h = this.template.canvas_height;
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const tolerance = 15;
      let updatedCount = 0;

      this.template.slots.forEach((slot) => {
        const targetColor = this._hexToRgb(slot.color);
        if (!targetColor) return;

        let pixels = [];
        let pixelIndices = [];

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const a = data[idx + 3];

            if (a > 0) {
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              if (Math.abs(r - targetColor.r) <= tolerance && 
                  Math.abs(g - targetColor.g) <= tolerance && 
                  Math.abs(b - targetColor.b) <= tolerance) {
                
                pixels.push({ x, y });
                pixelIndices.push(idx);
              }
            }
          }
        }

        if (pixels.length > 50) {
          for (let idx of pixelIndices) {
            data[idx + 3] = 0; // punch hole
          }

          const pca = this._calculatePCA(pixels);
          if (pca) {
            slot.cx = Math.round(pca.cx);
            slot.cy = Math.round(pca.cy);
            slot.w = Math.round(pca.w);
            slot.h = Math.round(pca.h);
            slot.rotation = pca.rotation;
            
            // Generate custom clip path from contour
            const pathStr = this._generateClipPath(pixels, slot.cx, slot.cy);
            if (pathStr) {
              slot.clipPath = pathStr;
            } else {
              delete slot.clipPath;
            }
            
            updatedCount++;
          }
        }
      });

      if (updatedCount > 0) {
        ctx.putImageData(imgData, 0, 0);
        this.template.frame_url = canvas.toDataURL('image/png');
        this._updateFrameUI();
        this._renderWorkspace();
        this._renderSlotsList();
      } else {
        alert("Không tìm thấy khối màu nào khớp với các Slot đã tạo.");
      }

      this.btnAutoScan.textContent = '🪄 Tự động quét & Xóa nền';
      this.btnAutoScan.disabled = false;
    };
    img.src = this.template.frame_url;
  }

  // ── Render Slots List UI ──
  _renderSlotsList() {
    this.slotsList.innerHTML = '';
    
    this.template.slots.forEach((slot, index) => {
      const item = document.createElement('div');
      item.className = 'tb-slot-item';
      
      const rotDeg = Math.round(slot.rotation * (180 / Math.PI)) || 0;

      item.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="color" class="color-edit" data-idx="${index}" value="${slot.color}" style="width:24px; height:24px; padding:0; border:none; cursor:pointer;">
            <strong style="color:var(--tb-accent);">Slot ${index + 1}</strong>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="tb-btn-icon btn-move-up" data-idx="${index}" title="Lên trên" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="tb-btn-icon btn-move-down" data-idx="${index}" title="Xuống dưới" ${index === this.template.slots.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="tb-btn-icon tb-danger btn-del-slot" data-idx="${index}" title="Xóa Slot">✕</button>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom: 8px;">
          <div>
            <label style="font-size:11px; color:var(--tb-text-muted);">Tâm X (px)</label>
            <input type="number" class="tb-input input-cx" data-idx="${index}" value="${slot.cx}">
          </div>
          <div>
            <label style="font-size:11px; color:var(--tb-text-muted);">Tâm Y (px)</label>
            <input type="number" class="tb-input input-cy" data-idx="${index}" value="${slot.cy}">
          </div>
          <div>
            <label style="font-size:11px; color:var(--tb-text-muted);">Chiều rộng (px)</label>
            <input type="number" class="tb-input input-w" data-idx="${index}" value="${slot.w}">
          </div>
          <div>
            <label style="font-size:11px; color:var(--tb-text-muted);">Chiều cao (px)</label>
            <input type="number" class="tb-input input-h" data-idx="${index}" value="${slot.h}">
          </div>
        </div>
        
        <div>
          <label style="font-size:11px; color:var(--tb-text-muted);">Góc nghiêng (Độ)</label>
          <input type="number" class="tb-input input-rot" data-idx="${index}" value="${rotDeg}">
        </div>
      `;
      
      this.slotsList.appendChild(item);
    });

    // Event Bindings for inputs
    this.slotsList.querySelectorAll('.color-edit').forEach(inp => {
      inp.addEventListener('change', (e) => {
        this.template.slots[e.target.dataset.idx].color = e.target.value.toLowerCase();
        this._renderWorkspace();
      });
    });
    
    this.slotsList.querySelectorAll('.input-cx').forEach(inp => {
      inp.addEventListener('input', (e) => { this.template.slots[e.target.dataset.idx].cx = parseFloat(e.target.value) || 0; this._renderWorkspace(); });
    });
    this.slotsList.querySelectorAll('.input-cy').forEach(inp => {
      inp.addEventListener('input', (e) => { this.template.slots[e.target.dataset.idx].cy = parseFloat(e.target.value) || 0; this._renderWorkspace(); });
    });
    this.slotsList.querySelectorAll('.input-w').forEach(inp => {
      inp.addEventListener('input', (e) => { this.template.slots[e.target.dataset.idx].w = parseFloat(e.target.value) || 0; this._renderWorkspace(); });
    });
    this.slotsList.querySelectorAll('.input-h').forEach(inp => {
      inp.addEventListener('input', (e) => { this.template.slots[e.target.dataset.idx].h = parseFloat(e.target.value) || 0; this._renderWorkspace(); });
    });
    this.slotsList.querySelectorAll('.input-rot').forEach(inp => {
      inp.addEventListener('input', (e) => { 
        this.template.slots[e.target.dataset.idx].rotation = (parseFloat(e.target.value) || 0) * (Math.PI / 180); 
        this._renderWorkspace(); 
      });
    });

    // Delete
    this.slotsList.querySelectorAll('.btn-del-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.template.slots.splice(e.target.dataset.idx, 1);
        this._renderSlotsList();
        this._renderWorkspace();
      });
    });

    // Move Up
    this.slotsList.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        if (idx > 0) {
          const temp = this.template.slots[idx];
          this.template.slots[idx] = this.template.slots[idx - 1];
          this.template.slots[idx - 1] = temp;
          this._renderSlotsList();
          this._renderWorkspace();
        }
      });
    });

    // Move Down
    this.slotsList.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        if (idx < this.template.slots.length - 1) {
          const temp = this.template.slots[idx];
          this.template.slots[idx] = this.template.slots[idx + 1];
          this.template.slots[idx + 1] = temp;
          this._renderSlotsList();
          this._renderWorkspace();
        }
      });
    });
  }

  // ── Save to Server ──
  async _saveToServer() {
    if (!this.template.name) {
      alert('Vui lòng nhập tên Template!');
      this.tplNameInput.focus();
      return;
    }
    
    this.template.magicColors = [...this.magicColors];
    
    // Update local list
    const idx = this.serverTemplates.findIndex(t => t.id === this.template.id);
    if (idx >= 0) {
      this.serverTemplates[idx] = this.template;
    } else {
      this.serverTemplates.push(this.template);
    }
    
    const btn = this.btnSaveTemplate;
    const oldText = btn.textContent;
    btn.textContent = 'Đang lưu...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.adminToken
        },
        body: JSON.stringify(this.serverTemplates)
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      btn.textContent = '✓ Đã lưu lên Server';
      btn.style.background = '#22c55e';
      this._renderServerTemplates();
    } catch (e) {
      console.error(e);
      alert("Lưu thất bại: " + e.message);
      btn.textContent = '❌ Lỗi lưu';
      btn.style.background = '#ef4444';
    }

    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  }

  // ── Render Server Templates ──
  _renderServerTemplates() {
    if (!this.serverTemplateList) return;
    this.serverTemplateList.innerHTML = '';
    if (this.serverTemplates.length === 0) {
      this.serverTemplateList.innerHTML = '<span style="font-size:12px; color:var(--tb-text-muted);">Chưa có template nào.</span>';
      return;
    }
    
    this.serverTemplates.forEach(t => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.background = 'var(--tb-bg)';
      div.style.padding = '8px 12px';
      div.style.borderRadius = '6px';
      div.style.border = '1px solid var(--tb-border)';
      div.style.cursor = 'pointer';
      
      if (this.template && this.template.id === t.id) {
        div.style.borderColor = 'var(--tb-accent)';
      }

      const name = document.createElement('span');
      name.textContent = t.name;
      name.style.fontSize = '12px';
      name.style.flex = '1';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.whiteSpace = 'nowrap';
      name.onclick = () => this._loadTemplate(t);
      
      const btnDel = document.createElement('button');
      btnDel.textContent = 'Xóa';
      btnDel.className = 'tb-btn-icon tb-danger';
      btnDel.style.marginLeft = '8px';
      btnDel.style.fontSize = '11px';
      btnDel.style.padding = '4px 8px';
      btnDel.style.width = 'auto';
      btnDel.onclick = (e) => {
        e.stopPropagation();
        this._deleteTemplate(t.id);
      };
      
      div.appendChild(name);
      div.appendChild(btnDel);
      this.serverTemplateList.appendChild(div);
    });
  }

  async _deleteTemplate(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa template này không?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': this.adminToken }
      });
      if (res.ok) {
        this.serverTemplates = this.serverTemplates.filter(t => t.id !== id);
        this._renderServerTemplates();
      } else {
        alert('Lỗi khi xóa template: ' + await res.text());
      }
    } catch (e) {
      alert('Lỗi kết nối khi xóa template!');
    }
  }

  _exportJson() {
    if (!this.template.name) this.template.name = 'Unnamed Template';
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.template, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `template_${this.template.id}.json`);
    dlAnchorElem.click();
  }

  _importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.id && data.slots) {
          this.template = data;
          this.tplNameInput.value = data.name || '';
          this.canvasWInput.value = data.canvas_width || 1748;
          this.canvasHInput.value = data.canvas_height || 2480;
          this._updateFrameUI();
          this._renderWorkspace();
          this._renderSlotsList();
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

  // ── New & Load Templates ──
  _createNewTemplate() {
    this.template = {
      id: 'tpl_' + Date.now(),
      name: '',
      paper_size: 'A5',
      canvas_width: 1748,
      canvas_height: 2480,
      frame_url: '',
      slots: []
    };
    this.tplNameInput.value = '';
    if (this.paperSizeSelect) this.paperSizeSelect.value = 'A5';
    this.canvasWInput.value = 1748;
    this.canvasHInput.value = 2480;
    this.framePreview.style.display = 'none';
    this.frameImg.src = '';
    this.workspaceFrameImg.src = '';
    this.workspaceFrameImg.style.display = 'none';
    
    this._renderWorkspace();
    this._renderSlotsList();
    this._renderServerTemplates();
  }

  _loadTemplate(t) {
    // deep copy to avoid editing reference directly until save
    this.template = JSON.parse(JSON.stringify(t));
    const paperSize = this.template.paper_size || (this.template.canvas_width > 2000 ? 'A4' : 'A5');
    this.template.paper_size = paperSize;
    
    this.tplNameInput.value = this.template.name || '';
    if (this.paperSizeSelect) this.paperSizeSelect.value = paperSize;
    this.canvasWInput.value = this.template.canvas_width || 1748;
    this.canvasHInput.value = this.template.canvas_height || 2480;
    
    if (this.template.frame_url) {
      this.frameImg.src = this.template.frame_url;
      this.framePreview.style.display = 'block';
      this.workspaceFrameImg.src = this.template.frame_url;
      this.workspaceFrameImg.style.display = 'block';
    } else {
      this.framePreview.style.display = 'none';
      this.frameImg.src = '';
      this.workspaceFrameImg.src = '';
      this.workspaceFrameImg.style.display = 'none';
    }
    
    if (this.template.magicColors) {
      this.magicColors = [...this.template.magicColors];
      // update color inputs if necessary
    }
    
    this._renderWorkspace();
    this._renderSlotsList();
    this._renderServerTemplates();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TemplateBuilderApp();
});
