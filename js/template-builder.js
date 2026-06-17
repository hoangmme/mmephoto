// ============================================
// MME Color Lab — Admin Template Builder
// ============================================

class TemplateBuilderApp {
  constructor() {
    this.template = {
      id: 'tpl_' + Date.now(),
      name: '',
      canvas_width: 1748,
      canvas_height: 2480,
      frame_url: '',
      slots: []
    };
    
    // Default magic colors
    this.magicColors = ['#01bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d', '#ff751f'];
    
    this.scale = 0.25; // Default zoom

    this._cacheDOM();
    this._bindEvents();
    this._renderWorkspace();
    this._renderSlotsList();
  }

  _cacheDOM() {
    this.tplNameInput = document.getElementById('tplName');
    this.canvasWInput = document.getElementById('canvasW');
    this.canvasHInput = document.getElementById('canvasH');
    
    // Frame
    this.btnUploadFrame = document.getElementById('btnUploadFrame');
    this.frameInput = document.getElementById('frameInput');
    this.framePreview = document.getElementById('framePreview');
    this.frameImg = document.getElementById('frameImg');
    this.btnRemoveFrame = document.getElementById('btnRemoveFrame');
    
    // Colors & Auto Scan
    this.btnAddNewColor = document.getElementById('btnAddNewColor');
    this.newColorPicker = document.getElementById('newColorPicker');
    this.btnAutoScan = document.getElementById('btnAutoScan');
    this.slotsColorList = document.getElementById('slotsColorList');
    
    // Workspace
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.slotsLayer = document.getElementById('slotsLayer');
    this.workspaceFrameImg = document.getElementById('workspaceFrameImg');
    
    // Zoom
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    
    // Header actions
    this.btnSaveTemplate = document.getElementById('btnSaveTemplate');
    this.btnExportJson = document.getElementById('btnExportJson');
    this.btnImportJson = document.getElementById('btnImportJson');
    this.jsonInput = document.getElementById('jsonInput');
  }

  _bindEvents() {
    // Basic settings
    this.tplNameInput.addEventListener('input', (e) => this.template.name = e.target.value);
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
        this.template.slots = [];
        this._updateFrameUI();
        this._renderWorkspace();
        this._renderSlotsList();
      };
      reader.readAsDataURL(file);
    });
    this.btnRemoveFrame.addEventListener('click', () => {
      this.template.frame_url = '';
      this.frameInput.value = '';
      this.template.slots = [];
      this._updateFrameUI();
      this._renderWorkspace();
      this._renderSlotsList();
    });

    // Color Management
    if (this.btnAddNewColor) {
      this.btnAddNewColor.addEventListener('click', () => {
        const c = this.newColorPicker.value;
        if (!this.magicColors.includes(c)) {
          this.magicColors.push(c);
          this._renderSlotsList();
        }
      });
    }

    // Auto Scan
    this.btnAutoScan.addEventListener('click', () => this._autoScanAndPunch());

    // Zoom
    this.btnZoomIn.addEventListener('click', () => this._setZoom(this.scale + 0.1));
    this.btnZoomOut.addEventListener('click', () => this._setZoom(this.scale - 0.1));

    // Save/Export/Import
    this.btnSaveTemplate.addEventListener('click', () => this._saveToLocal());
    this.btnExportJson.addEventListener('click', () => this._exportJson());
    this.btnImportJson.addEventListener('click', () => this.jsonInput.click());
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
      
      // Calculate top-left for standard CSS positioning before transform
      const left = slot.cx - slot.w / 2;
      const top = slot.cy - slot.h / 2;
      
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.width = slot.w + 'px';
      el.style.height = slot.h + 'px';
      el.style.pointerEvents = 'none';
      el.style.borderColor = slot.color || '#f59e0b';
      el.style.backgroundColor = (slot.color || '#f59e0b') + '33';
      
      // Apply rotation around its center
      const rotDeg = (slot.rotation || 0) * (180 / Math.PI);
      el.style.transform = `rotate(${rotDeg}deg)`;
      
      el.innerHTML = `<span style="color:${slot.color || '#f59e0b'}">S${index + 1}</span>`;
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

    // Angle of the major axis
    let theta = 0.5 * Math.atan2(2 * m11, m20 - m02);

    // To get exact width and height, rotate all points by -theta
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

    // Normalize rotation to be between -45 and 45 degrees so that portrait frames stay portrait
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
      let newSlots = [];

      // Scan for each magic color
      this.magicColors.forEach((hex, index) => {
        const targetColor = this._hexToRgb(hex);
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
          // Punch holes
          for (let idx of pixelIndices) {
            data[idx + 3] = 0;
          }

          // Calculate rotated bounding box via PCA
          const pca = this._calculatePCA(pixels);
          if (pca) {
            newSlots.push({
              id: 'slot_' + (index + 1),
              color: hex,
              cx: Math.round(pca.cx),
              cy: Math.round(pca.cy),
              w: Math.round(pca.w),
              h: Math.round(pca.h),
              rotation: pca.rotation
            });
          }
        }
      });

      if (newSlots.length > 0) {
        ctx.putImageData(imgData, 0, 0);
        this.template.frame_url = canvas.toDataURL('image/png');
        this.template.slots = newSlots;
        
        this._updateFrameUI();
        this._renderWorkspace();
        this._renderSlotsList();
      } else {
        alert("Không tìm thấy khối màu chuẩn nào trên ảnh. Đảm bảo mã màu trên thiết kế hoàn toàn khớp với danh sách bên trái.");
      }

      this.btnAutoScan.textContent = '🪄 Tự động quét & Xóa nền';
      this.btnAutoScan.disabled = false;
    };
    img.src = this.template.frame_url;
  }

  // ── Render Slots List UI ──
  _renderSlotsList() {
    this.slotsColorList.innerHTML = '';
    
    this.magicColors.forEach((hex, index) => {
      const slotData = this.template.slots.find(s => s.color === hex);
      
      const item = document.createElement('div');
      item.className = 'tb-slot-item';
      
      let statusHtml = '<span style="color:var(--tb-text-muted); font-size:12px;">Chưa quét</span>';
      if (slotData) {
        const rotDeg = Math.round(slotData.rotation * (180 / Math.PI));
        statusHtml = `<span style="color:#22c55e; font-size:12px;">✓ Đã tìm thấy (${slotData.w}x${slotData.h}) | Góc: ${rotDeg}°</span>`;
      }

      item.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="color" value="${hex}" class="color-edit" data-idx="${index}" style="width:20px; height:20px; padding:0; border:none; border-radius:50%; cursor:pointer;">
            <strong>Slot ${index + 1}</strong>
            <span style="font-size:11px; color:var(--tb-text-muted);">${hex}</span>
          </div>
          <button class="tb-btn-icon tb-danger btn-del-color" data-idx="${index}" title="Xóa màu">✕</button>
        </div>
        ${statusHtml}
      `;
      
      this.slotsColorList.appendChild(item);
    });

    // Bind color edit & delete
    this.slotsColorList.querySelectorAll('.color-edit').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = e.target.dataset.idx;
        this.magicColors[idx] = e.target.value.toLowerCase();
        this._renderSlotsList();
      });
    });

    this.slotsColorList.querySelectorAll('.btn-del-color').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.idx;
        this.magicColors.splice(idx, 1);
        this._renderSlotsList();
      });
    });
  }

  // ── Save & Export ──
  _saveToLocal() {
    if (!this.template.name) {
      alert('Vui lòng nhập tên Template!');
      this.tplNameInput.focus();
      return;
    }
    
    // Convert magicColors back to template property so we can recall them
    this.template.magicColors = [...this.magicColors];

    let templates = [];
    try {
      const stored = localStorage.getItem('mme_print_templates');
      if (stored) templates = JSON.parse(stored);
    } catch(e) {}
    
    const idx = templates.findIndex(t => t.id === this.template.id);
    if (idx >= 0) {
      templates[idx] = this.template;
    } else {
      templates.push(this.template);
    }
    
    localStorage.setItem('mme_print_templates', JSON.stringify(templates));
    
    const btn = this.btnSaveTemplate;
    const oldText = btn.textContent;
    btn.textContent = '✓ Đã lưu';
    btn.style.background = '#22c55e';
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = '';
    }, 1500);
  }

  _exportJson() {
    if (!this.template.name) this.template.name = 'Unnamed Template';
    this.template.magicColors = [...this.magicColors];
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
          if (data.magicColors) {
            this.magicColors = data.magicColors;
          }
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
}

document.addEventListener('DOMContentLoaded', () => {
  window.tbApp = new TemplateBuilderApp();
});
