import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=175';
import { CanvasRenderer } from '../components/CanvasRenderer.js?v=175';
import { CanvasExporter } from '../components/CanvasExporter.js?v=175';

export const CanvasMixin = {
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
,

_loadTemplateImages() {
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    if (!tmpl) return;
    
    this.frameImageObj = null;
    this.bgImageObj = null;

    let loadedCount = 0;
    let imagesToLoad = 0;

    const tryRender = () => {
       loadedCount++;
       if (loadedCount >= imagesToLoad) {
          this._renderCanvas();
       }
    };

    if (tmpl.frame_url) imagesToLoad++;
    if (tmpl.background_image) imagesToLoad++;

    if (tmpl.frame_url) {
      this.frameImageObj = new Image();
      this.frameImageObj.crossOrigin = 'anonymous';
      this.frameImageObj.onload = tryRender;
      this.frameImageObj.src = tmpl.frame_url;
    }

    if (tmpl.background_image) {
      this.bgImageObj = new Image();
      this.bgImageObj.crossOrigin = 'anonymous';
      this.bgImageObj.onload = tryRender;
      this.bgImageObj.src = tmpl.background_image;
    }
    
    if (imagesToLoad === 0) {
       this._renderCanvas();
    }
  }
,

  _onCanvasClick(e) {
    const roomData = this.activeRoom && this.rooms && this.rooms[this.activeRoom];
    const step = roomData ? (roomData.step || 3) : (this.currentStep || 3);
    if (step === 1 || step === 4) return;

    // Dynamically detect target canvas element from click event
    const targetCanvas = (e && e.target && e.target.tagName === 'CANVAS') ? e.target : (this.canvas || document.getElementById('printCanvas0'));
    let cIdx = 0;
    if (targetCanvas && targetCanvas.id === 'printCanvas1') {
      cIdx = 1;
    } else if (targetCanvas && targetCanvas.id === 'printCanvas0') {
      cIdx = 0;
    } else {
      cIdx = this.activeCanvasIndex || 0;
    }

    this.activeCanvasIndex = cIdx;
    this.canvas = targetCanvas;
    this.currentTemplate = (this.selectedTemplates && this.selectedTemplates[cIdx]) ? this.selectedTemplates[cIdx] : this.currentTemplate;

    if (this.canvasesState && this.canvasesState[cIdx]) {
      if (!this.canvasesState[cIdx].slots) this.canvasesState[cIdx].slots = [];
      this.slots = this.canvasesState[cIdx].slots;
    }

    const rect = targetCanvas.getBoundingClientRect();
    const scaleX = targetCanvas.width / rect.width;
    const scaleY = targetCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const targetTemplateId = (this.canvasesState && this.canvasesState[cIdx])
      ? this.canvasesState[cIdx].templateId
      : (this.selectedTemplates ? (this.selectedTemplates[cIdx] || this.currentTemplate) : this.currentTemplate);

    const tmpl = ALL_TEMPLATES[targetTemplateId] || ALL_TEMPLATES[this.currentTemplate];
    if (!tmpl || !tmpl.slots) return;

    let clickedSlot = -1;

    for (let i = 0; i < tmpl.slots.length; i++) {
      const s = tmpl.slots[i];
      // Convert to local space
      const dx = x - s.cx;
      const dy = y - s.cy;
      const rot = s.rotation || 0;
      const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
      const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);

      // Generous hit tolerance (10% + 20px) to ensure slot 0 and tilted slots are easily clickable
      const padW = s.w * 0.1 + 20;
      const padH = s.h * 0.1 + 20;

      if (localX >= -s.w/2 - padW && localX <= s.w/2 + padW && localY >= -s.h/2 - padH && localY <= s.h/2 + padH) {
        clickedSlot = i;
        break;
      }
    }

    if (clickedSlot >= 0) {
      this.selectedSlotIndex = clickedSlot;

      if (this.canvasesState && this.canvasesState[cIdx]) {
        this.canvasesState[cIdx].selectedSlotIndex = clickedSlot;
      }

      // If an image is selected in sidebar, assign it to the clicked slot
      if (this.selectedImageId) {
        this._assignToSlot(clickedSlot, this.selectedImageId);
        this.selectedImageId = null;
      }

      if (this._syncStaffDraftState) this._syncStaffDraftState();

      this._renderCanvas();
      this._renderSlotProps();
      this._updateImageListUI();
    }
  },

  _assignToSlot(slotIndex, imageId, skipSync = false) {
    const cIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
    if (this.canvasesState && this.canvasesState[cIdx]) {
      if (!this.canvasesState[cIdx].slots) this.canvasesState[cIdx].slots = [];
      this.slots = this.canvasesState[cIdx].slots;
      this.canvasesState[cIdx].selectedSlotIndex = slotIndex;
    }
    if (!this.slots) this.slots = [];
    this.selectedSlotIndex = slotIndex;

    if (!this.slots[slotIndex]) {
      this.slots[slotIndex] = {
        imageId: null,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0
      };
    }
    this.slots[slotIndex].imageId = imageId;
    this.slots[slotIndex].zoom = 1.0;
    this.slots[slotIndex].panX = 0;
    this.slots[slotIndex].panY = 0;
    this.slots[slotIndex].rotation = 0;
    this.slots[slotIndex].assignedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (this._syncStaffDraftState) this._syncStaffDraftState();

    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
  },

  // ── Auto Fill ──

  _autoFill(skipSync = false) {
    const roomData = this.activeRoom && this.rooms[this.activeRoom];
    const currentImages = (this.images && this.images.length > 0) ? this.images : (roomData && roomData.images ? roomData.images : []);
    if (currentImages.length === 0) return;

    if (!this._imageCache) this._imageCache = {};
    
    const selTmpls = (this.selectedTemplates && this.selectedTemplates.length > 0)
      ? this.selectedTemplates
      : (this.currentTemplate ? [this.currentTemplate] : []);

    // Ensure canvasesState matches selectedTemplates in length and templateIds order
    if (!this.canvasesState || this.canvasesState.length !== selTmpls.length || this.canvasesState.some((c, idx) => c.templateId !== selTmpls[idx])) {
      this.canvasesState = selTmpls.map(tId => {
        const tmpl = ALL_TEMPLATES[tId];
        const numSlots = tmpl && tmpl.slots ? tmpl.slots.length : 0;
        return {
          templateId: tId,
          slots: Array(numSlots).fill(null).map(() => ({ imageId: null, zoom: 1.0, panX: 0, panY: 0, rotation: 0 })),
          selectedSlotIndex: -1
        };
      });
    }
    
    const maxSlotsTotal = this.canvasesState.reduce((sum, cState) => {
        const t = ALL_TEMPLATES[cState.templateId];
        return sum + (t ? t.slots.length : 0);
    }, 0);

    // Ensure all current images are preloaded in imageCache
    currentImages.forEach(img => {
      if (img.id && !this._imageCache[img.id]) {
        const srcUrl = img.objectUrl || img.url;
        if (srcUrl) {
          this._preloadImage(img.id, srcUrl).then(() => this._renderCanvas());
        }
      }
    });

    if (!this.selectedPhotos) this.selectedPhotos = new Set();
    
    // Tự động tick chọn ảnh CHỈ KHI NGƯỜI DÙNG CHƯA CHỌN ẢNH NÀO (size = 0)
    if (this.selectedPhotos.size === 0 && currentImages.length > 0 && maxSlotsTotal > 0) {
      for (let i = 0; i < currentImages.length && this.selectedPhotos.size < maxSlotsTotal; i++) {
        const img = currentImages[i];
        if (img && img.id && !this.selectedPhotos.has(img.id)) {
          this.selectedPhotos.add(img.id);
        }
      }

      // Đồng bộ danh sách ảnh đã tick vào session
      if (roomData && roomData.queue) {
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess) {
          activeSess.selectedImages = Array.from(this.selectedPhotos);
        }
      }
      if (this._updateImageListUI) this._updateImageListUI();
    }

    const selectedArr = Array.from(this.selectedPhotos);
    let globalIndex = 0;

    // Gán ảnh vào từng canvas (không tự lặp lại nếu người dùng đã tự chọn số lượng ảnh mong muốn)
    this.canvasesState.forEach((cState, cIdx) => {
      const cTmpl = ALL_TEMPLATES[cState.templateId];
      if (!cTmpl || !cTmpl.slots) return;
      
      const maxSlots = cTmpl.slots.length;
      if (!cState.slots || cState.slots.length !== maxSlots) {
        cState.slots = Array(maxSlots).fill(null).map(() => ({ imageId: null, zoom: 1.0, panX: 0, panY: 0, rotation: 0 }));
      }
      
      for (let i = 0; i < maxSlots; i++) {
        let targetImgId = null;
        if (globalIndex < selectedArr.length) {
          targetImgId = selectedArr[globalIndex];
        }
        
        if (cState.slots[i].imageId !== targetImgId) {
          cState.slots[i].imageId = targetImgId;
          cState.slots[i].zoom = 1.0;
          cState.slots[i].panX = 0;
          cState.slots[i].panY = 0;
          cState.slots[i].rotation = 0;
          if (targetImgId) {
            cState.slots[i].assignedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          }
        }
        globalIndex++;
      }
      
      // Cập nhật lại this.slots nếu đang là canvas hiện tại
      if (cIdx === (this.activeCanvasIndex || 0)) {
        this.slots = cState.slots;
      }
    });

    if (roomData && roomData.queue) {
      const activeSess = roomData.queue.find(s => s.id === roomData.session);
      if (activeSess) {
        activeSess.canvasesState = JSON.parse(JSON.stringify(this.canvasesState));
      }
    }
  }
,

  _applySelectionToSlots() {
    if (this._autoFill) {
      this._autoFill(true);
    }
  }
,

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
,

_zoomSlot(slotIndex, zoom) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = Math.max(0.5, Math.min(3.0, zoom));
    this._clampPan(slotIndex);
    this._renderCanvas();
    this._renderSlotProps();
  }
,

_resetCrop(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = 1.0;
    slot.panX = 0;
    slot.panY = 0;
    this._renderCanvas();
    this._renderSlotProps();
    this._syncState(this.activeRoom);
  }
,

_removeFromSlot(slotIndex) {
    this.slots[slotIndex] = { imageId: null, zoom: 1.0, panX: 0, panY: 0, assignedAt: null };
    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
    this._syncState(this.activeRoom);
  }
,

_clampPan(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.imageId) return;

    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    if (!tmpl || !tmpl.slots || !tmpl.slots[slotIndex]) return;
    const slotDef = tmpl.slots[slotIndex];
    const img = this._imageCache ? this._imageCache[slot.imageId] : null;
    if (!img) return;

    // Calculate cover dimensions
    const { drawW, drawH } = this._calcCover(img.naturalWidth, img.naturalHeight, slotDef.w, slotDef.h, slot.zoom || 1.0);

    // Allow generous free panning in all 4 directions (left, right, up, down)
    const maxPanX = Math.max(slotDef.w * 0.65, (drawW - slotDef.w) / 2 + slotDef.w * 0.4);
    const maxPanY = Math.max(slotDef.h * 0.65, (drawH - slotDef.h) / 2 + slotDef.h * 0.4);

    slot.panX = Math.max(-maxPanX, Math.min(maxPanX, slot.panX || 0));
    slot.panY = Math.max(-maxPanY, Math.min(maxPanY, slot.panY || 0));
  }
,

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
,

_renderSlotProps() {
    if (!this.slotProps) return;
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
        <button class="pl-prop-btn" id="btnRotateSlot">↻ Xoay 90°</button>
        <button class="pl-prop-btn" id="btnResetRotation">↺ Reset Xoay (0°)</button>
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

    document.getElementById('btnRotateSlot').addEventListener('click', () => {
      const sData = this.slots[this.selectedSlotIndex];
      if (sData) {
        sData.rotation = ((sData.rotation || 0) + 90) % 360;
        this._clampPan(this.selectedSlotIndex);
        this._renderCanvas();
        this._renderSlotProps();
      }
    });

    document.getElementById('btnResetRotation').addEventListener('click', () => {
      const sData = this.slots[this.selectedSlotIndex];
      if (sData) {
        sData.rotation = 0;
        this._clampPan(this.selectedSlotIndex);
        this._renderCanvas();
        this._renderSlotProps();
      }
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
,

_requestRenderCanvas() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      this._renderCanvas();
    });
  },

_renderCanvas() {
    const templatesToRender = (this.selectedTemplates && this.selectedTemplates.length > 0) 
        ? this.selectedTemplates 
        : (this.currentTemplate ? [this.currentTemplate] : []);
        
    if (templatesToRender.length === 0) return;
    
    // Backup active state to restore later
    const activeIdx = this.activeCanvasIndex || 0;
    const backupCanvas = this.canvas;
    const backupTemplate = this.currentTemplate;
    const backupSlots = this.slots;
    const backupSelectedSlotIndex = this.selectedSlotIndex;

    const maxCanvases = Math.min(templatesToRender.length, 2); // Max 2 canvases for A5
    
    // Manage visibility of canvas columns based on number of templates
    const col0 = document.getElementById('canvasWrapper0')?.parentElement;
    const col1 = document.getElementById('colCanvas1');
    if (col0) col0.style.display = 'flex';
    if (col1) col1.style.display = maxCanvases > 1 ? 'flex' : 'none';

    for (let i = 0; i < maxCanvases; i++) {
        const c = document.getElementById('printCanvas' + i);
        if (!c) continue;
        
        // Update styling for active state
        c.classList.toggle('active', i === activeIdx);

        // Temporarily set state for rendering this canvas
        this.canvas = c;
        this.currentTemplate = templatesToRender[i];
        
        if (this.canvasesState && this.canvasesState[i]) {
            this.slots = this.canvasesState[i].slots || [];
            const stateSel = this.canvasesState[i].selectedSlotIndex;
            this.selectedSlotIndex = (i === activeIdx) ? (stateSel !== undefined && stateSel !== null ? stateSel : -1) : -1;
        } else {
            this.slots = [];
            this.selectedSlotIndex = -1;
        }

        // Determine if we need to show labels (always use flex)
        const labelEl = document.getElementById('canvasLabel' + i);
        if (labelEl) {
            labelEl.style.display = 'flex';
        }

        this._drawToCanvas(c, true);
    }
    
    // Restore active state
    this.canvas = backupCanvas;
    this.currentTemplate = backupTemplate;
    const finalSel = (this.canvasesState && this.canvasesState[activeIdx]) ? this.canvasesState[activeIdx].selectedSlotIndex : backupSelectedSlotIndex;
    this.selectedSlotIndex = (finalSel !== undefined && finalSel !== null) ? finalSel : -1;
    this.slots = (this.canvasesState && this.canvasesState[activeIdx]) ? this.canvasesState[activeIdx].slots : backupSlots;
  },

  _drawToCanvas(canvas, isPreview, overrideTemplate = null, isPreviewSwiper = false) {
    const currentStep = (this.activeRoom && this.rooms && this.rooms[this.activeRoom])
      ? (this.rooms[this.activeRoom].step || 1)
      : (this.currentStep || 1);

    CanvasRenderer.drawToCanvas(canvas, {
      currentTemplate: this.currentTemplate,
      overrideTemplate: overrideTemplate,
      slots: this.slots,
      selectedSlotIndex: this.selectedSlotIndex,
      imageCache: this._imageCache || {},
      bgImageObj: this.bgImageObj,
      frameImageObj: this.frameImageObj,
      defaultPreviewImages: this.defaultPreviewImages || [],
      isPreview: isPreview,
      currentStep: currentStep,
      isPreviewSwiper: isPreviewSwiper
    });
  },

  _drawImageInSlot(ctx, img, slotDef, slotData) {
    CanvasRenderer.drawImageInSlot(ctx, img, slotDef, slotData);
  },

  // ══════════════════════════════════════
  // Export
  // ══════════════════════════════════════

  async _exportJPG() {
    await CanvasExporter.exportJPG(this);
  },

  async _exportPDF() {
    await CanvasExporter.exportPDF(this);
  },

  async _uploadFinalFrame() {
    await CanvasExporter.uploadFinalFrame(this);
  },

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
,

_showOverlay(show) {
    this.exportOverlay.classList.toggle('visible', show);
  },

};
