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
    
    this.scale = 0.25; // Default zoom
    this.activeSlotId = null;
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;

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
    
    // Slots
    this.btnAddSlot = document.getElementById('btnAddSlot');
    this.slotsList = document.getElementById('slotsList');

    // Magic Detect
    this.magicDetectTool = document.getElementById('magicDetectTool');
    this.magicColorPicker = document.getElementById('magicColorPicker');
    this.magicColorHex = document.getElementById('magicColorHex');
    this.btnMagicDetect = document.getElementById('btnMagicDetect');
    this.magicDetectStatus = document.getElementById('magicDetectStatus');
    
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
        this._updateFrameUI();
      };
      reader.readAsDataURL(file);
    });
    this.btnRemoveFrame.addEventListener('click', () => {
      this.template.frame_url = '';
      this.frameInput.value = '';
      this._updateFrameUI();
    });

    // Add Slot
    this.btnAddSlot.addEventListener('click', () => {
      const id = 'slot_' + (this.template.slots.length + 1) + '_' + Date.now().toString().slice(-4);
      this.template.slots.push({
        id: id,
        x: 100,
        y: 100,
        width: 800,
        height: 1200
      });
      this.activeSlotId = id;
      this._renderSlotsList();
      this._renderWorkspace();
    });

    // Zoom
    this.btnZoomIn.addEventListener('click', () => this._setZoom(this.scale + 0.1));
    this.btnZoomOut.addEventListener('click', () => this._setZoom(this.scale - 0.1));

    // Workspace Mouse Events (Drag & Resize)
    this.slotsLayer.addEventListener('mousedown', this._onWorkspaceMouseDown.bind(this));
    document.addEventListener('mousemove', this._onWorkspaceMouseMove.bind(this));
    document.addEventListener('mouseup', this._onWorkspaceMouseUp.bind(this));

    // Magic Detect
    this.magicColorPicker.addEventListener('input', (e) => this.magicColorHex.value = e.target.value);
    this.magicColorHex.addEventListener('input', (e) => this.magicColorPicker.value = e.target.value);
    this.btnMagicDetect.addEventListener('click', () => this._magicDetectAndPunch(this.magicColorHex.value));

    // Save/Export/Import
    this.btnSaveTemplate.addEventListener('click', () => this._saveToLocal());
    this.btnExportJson.addEventListener('click', () => this._exportJson());
    this.btnImportJson.addEventListener('click', () => this.jsonInput.click());
    this.jsonInput.addEventListener('change', this._importJson.bind(this));
  }

  // ── Magic Detect ──
  _hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  _magicDetectAndPunch(hexColor) {
    if (!this.template.frame_url) return;

    const targetColor = this._hexToRgb(hexColor);
    if (!targetColor) {
      alert('Mã màu không hợp lệ!');
      return;
    }

    this.btnMagicDetect.textContent = 'Đang xử lý...';
    this.btnMagicDetect.disabled = true;

    // We must render the image at its natural resolution onto an offscreen canvas
    const img = new Image();
    img.onload = () => {
      // Use template size instead of img.naturalWidth in case they differ, 
      // but usually they should be the same.
      const w = this.template.canvas_width;
      const h = this.template.canvas_height;
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;
      let foundPixels = 0;

      // Tolerance for color matching
      const tolerance = 15;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 0) { // Ignore transparent pixels
            const rDiff = Math.abs(r - targetColor.r);
            const gDiff = Math.abs(g - targetColor.g);
            const bDiff = Math.abs(b - targetColor.b);

            if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
              // Match found
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              
              // Punch hole (make transparent)
              data[idx + 3] = 0;
              foundPixels++;
            }
          }
        }
      }

      if (foundPixels > 50) { // arbitrary threshold to avoid noise
        // Put data back and get new base64
        ctx.putImageData(imgData, 0, 0);
        this.template.frame_url = canvas.toDataURL('image/png');
        this._updateFrameUI(); // Refresh the image in the UI

        // Calculate slot boundaries
        const slotW = maxX - minX + 1;
        const slotH = maxY - minY + 1;

        const id = 'slot_' + (this.template.slots.length + 1) + '_' + Date.now().toString().slice(-4);
        this.template.slots.push({
          id: id,
          x: minX,
          y: minY,
          width: slotW,
          height: slotH
        });
        
        this.activeSlotId = id;
        this._renderSlotsList();
        this._renderWorkspace();

        this.magicDetectStatus.style.display = 'block';
        setTimeout(() => this.magicDetectStatus.style.display = 'none', 3000);
      } else {
        alert('Không tìm thấy vùng màu ' + hexColor + ' trên ảnh!');
      }

      this.btnMagicDetect.textContent = '🔍 Quét & Đục lỗ';
      this.btnMagicDetect.disabled = false;
    };
    img.src = this.template.frame_url;
  }

  // ── Frame UI ──
  _updateFrameUI() {
    if (this.template.frame_url) {
      this.frameImg.src = this.template.frame_url;
      this.framePreview.style.display = 'block';
      this.btnUploadFrame.style.display = 'none';
      this.magicDetectTool.style.display = 'block';
      
      this.workspaceFrameImg.src = this.template.frame_url;
      this.workspaceFrameImg.style.display = 'block';
    } else {
      this.framePreview.style.display = 'none';
      this.btnUploadFrame.style.display = 'block';
      this.magicDetectTool.style.display = 'none';
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
      el.className = 'tb-visual-slot';
      if (slot.id === this.activeSlotId) el.classList.add('active');
      el.id = 'visual_' + slot.id;
      el.dataset.id = slot.id;
      
      el.style.left = slot.x + 'px';
      el.style.top = slot.y + 'px';
      el.style.width = slot.width + 'px';
      el.style.height = slot.height + 'px';
      el.innerHTML = `<span>S${index + 1}</span>`;
      
      // Add resize handles if active
      if (slot.id === this.activeSlotId) {
        ['nw', 'ne', 'sw', 'se'].forEach(dir => {
          const handle = document.createElement('div');
          handle.className = `tb-resize-handle ${dir}`;
          handle.dataset.dir = dir;
          el.appendChild(handle);
        });
      }
      
      this.slotsLayer.appendChild(el);
    });
  }

  // ── Mouse Interactions (Drag & Resize) ──
  _onWorkspaceMouseDown(e) {
    if (e.target.classList.contains('tb-resize-handle')) {
      this.isResizing = true;
      this.resizeHandle = e.target.dataset.dir;
      this.activeSlotId = e.target.parentElement.dataset.id;
      this._renderSlotsList();
      this._renderWorkspace();
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startSlot = { ...this.template.slots.find(s => s.id === this.activeSlotId) };
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    const slotEl = e.target.closest('.tb-visual-slot');
    if (slotEl) {
      this.activeSlotId = slotEl.dataset.id;
      this.isDragging = true;
      this._renderSlotsList();
      this._renderWorkspace();
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startSlot = { ...this.template.slots.find(s => s.id === this.activeSlotId) };
      e.stopPropagation();
      e.preventDefault();
    } else {
      this.activeSlotId = null;
      this._renderSlotsList();
      this._renderWorkspace();
    }
  }

  _onWorkspaceMouseMove(e) {
    if (!this.activeSlotId || (!this.isDragging && !this.isResizing)) return;
    
    const dx = (e.clientX - this.startX) / this.scale;
    const dy = (e.clientY - this.startY) / this.scale;
    
    const slotIndex = this.template.slots.findIndex(s => s.id === this.activeSlotId);
    if (slotIndex < 0) return;
    
    const slot = this.template.slots[slotIndex];
    
    if (this.isDragging) {
      slot.x = Math.round(this.startSlot.x + dx);
      slot.y = Math.round(this.startSlot.y + dy);
    } else if (this.isResizing) {
      if (this.resizeHandle.includes('e')) {
        slot.width = Math.max(50, Math.round(this.startSlot.width + dx));
      }
      if (this.resizeHandle.includes('s')) {
        slot.height = Math.max(50, Math.round(this.startSlot.height + dy));
      }
      if (this.resizeHandle.includes('w')) {
        const newW = Math.max(50, Math.round(this.startSlot.width - dx));
        slot.x = this.startSlot.x + (this.startSlot.width - newW);
        slot.width = newW;
      }
      if (this.resizeHandle.includes('n')) {
        const newH = Math.max(50, Math.round(this.startSlot.height - dy));
        slot.y = this.startSlot.y + (this.startSlot.height - newH);
        slot.height = newH;
      }
    }
    
    this._updateVisualSlotFast(slot);
  }

  _onWorkspaceMouseUp() {
    if (this.isDragging || this.isResizing) {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this._renderSlotsList(); // Update inputs
    }
  }

  _updateVisualSlotFast(slot) {
    const el = document.getElementById('visual_' + slot.id);
    if (el) {
      el.style.left = slot.x + 'px';
      el.style.top = slot.y + 'px';
      el.style.width = slot.width + 'px';
      el.style.height = slot.height + 'px';
    }
  }

  // ── Render Slots Input List ──
  _renderSlotsList() {
    this.slotsList.innerHTML = '';
    
    this.template.slots.forEach((slot, index) => {
      const item = document.createElement('div');
      item.className = 'tb-slot-item' + (slot.id === this.activeSlotId ? ' active' : '');
      
      item.innerHTML = `
        <div class="tb-slot-header">
          <span>Slot ${index + 1}</span>
          <button class="tb-btn-icon tb-danger btn-del" data-id="${slot.id}" title="Xóa">✕</button>
        </div>
        <div class="tb-slot-body">
          <div class="tb-group">
            <label>X (px)</label>
            <input type="number" class="tb-input inp-x" value="${slot.x}">
          </div>
          <div class="tb-group">
            <label>Y (px)</label>
            <input type="number" class="tb-input inp-y" value="${slot.y}">
          </div>
          <div class="tb-group">
            <label>Width</label>
            <input type="number" class="tb-input inp-w" value="${slot.width}">
          </div>
          <div class="tb-group">
            <label>Height</label>
            <input type="number" class="tb-input inp-h" value="${slot.height}">
          </div>
        </div>
      `;
      
      // Click to active
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
          this.activeSlotId = slot.id;
          this._renderSlotsList();
          this._renderWorkspace();
        }
      });
      
      // Inputs
      const updateFromInput = () => {
        slot.x = parseInt(item.querySelector('.inp-x').value) || 0;
        slot.y = parseInt(item.querySelector('.inp-y').value) || 0;
        slot.width = parseInt(item.querySelector('.inp-w').value) || 100;
        slot.height = parseInt(item.querySelector('.inp-h').value) || 100;
        this._renderWorkspace();
      };
      
      item.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', updateFromInput);
      });
      
      // Delete
      item.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        this.template.slots = this.template.slots.filter(s => s.id !== slot.id);
        if (this.activeSlotId === slot.id) this.activeSlotId = null;
        this._renderSlotsList();
        this._renderWorkspace();
      });
      
      this.slotsList.appendChild(item);
    });
  }

  // ── Save & Export ──
  _saveToLocal() {
    if (!this.template.name) {
      alert('Vui lòng nhập tên Template!');
      this.tplNameInput.focus();
      return;
    }
    
    let templates = [];
    try {
      const stored = localStorage.getItem('mme_print_templates');
      if (stored) templates = JSON.parse(stored);
    } catch(e) {}
    
    // Check if exists, update or push
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
          
          // Populate UI
          this.tplNameInput.value = data.name || '';
          this.canvasWInput.value = data.canvas_width || 1748;
          this.canvasHInput.value = data.canvas_height || 2480;
          this._updateFrameUI();
          this.activeSlotId = null;
          this._renderSlotsList();
          this._renderWorkspace();
        } else {
          alert('File JSON không hợp lệ!');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.tbApp = new TemplateBuilderApp();
});
