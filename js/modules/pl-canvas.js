import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

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
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    if (step === 1 || step === 4) return;

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
,

_assignToSlot(slotIndex, imageId, skipSync = false) {
    this.slots[slotIndex].imageId = imageId;
    this.slots[slotIndex].zoom = 1.0;
    this.slots[slotIndex].panX = 0;
    this.slots[slotIndex].panY = 0;
    this.slots[slotIndex].rotation = 0; // In degrees
    this.slots[slotIndex].assignedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    this.selectedImageId = null;

    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
    if (!skipSync) {
      this._syncState(this.activeRoom);
    }
  }

  // ── Auto Fill ──
,

  _autoFill(skipSync = false) {
    const roomData = this.activeRoom && this.rooms[this.activeRoom];
    const currentImages = roomData && roomData.images ? roomData.images : [];
    if (currentImages.length === 0) return;

    const hasSelection = this.selectedPhotos && this.selectedPhotos.size > 0;

    if (hasSelection) {
      // User made a selection — ONLY use selected photos, never add unselected ones
      
      // 1. Remove images from slots that are NO LONGER in selectedPhotos
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].imageId && !this.selectedPhotos.has(this.slots[i].imageId)) {
           this._removeSlotImage(i, true); // skipSync = true
        }
      }

      // 2. Find which selected photos are not yet in any slot
      const usedImageIds = new Set();
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].imageId) usedImageIds.add(this.slots[i].imageId);
      }

      const selectedArr = Array.from(this.selectedPhotos).filter(id => !usedImageIds.has(id));
      
      // 3. Fill empty slots with the remaining selected photos
      let selectedIdx = 0;
      for (let i = 0; i < this.slots.length && selectedIdx < selectedArr.length; i++) {
        if (!this.slots[i].imageId) {
          this._assignToSlot(i, selectedArr[selectedIdx], skipSync);
          selectedIdx++;
        }
      }
    } else {
      // No selection — fill empty slots with gallery photos (no duplicates)
      const usedImageIds = new Set();
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].imageId) usedImageIds.add(this.slots[i].imageId);
      }
      const unusedImages = currentImages.filter(img => !usedImageIds.has(img.id));
      let unusedIdx = 0;
      for (let i = 0; i < this.slots.length && unusedIdx < unusedImages.length; i++) {
        if (!this.slots[i].imageId) {
          this._assignToSlot(i, unusedImages[unusedIdx].id, skipSync);
          unusedIdx++;
        }
      }
    }
  }
,

_applySelectionToSlots() {
    if (this.selectedPhotos && this.selectedPhotos.size === 0) {
      if (this._autoFill) this._autoFill(true);
    } else {
      const selectedArr = Array.from(this.selectedPhotos || []);
      // Clear all slots first
      this.slots.forEach(s => s.imageId = null);
      // Assign selected photos
      for (let i = 0; i < selectedArr.length && i < this.slots.length; i++) {
        this._assignToSlot(i, selectedArr[i], true);
      }
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
    const slotDef = tmpl.slots[slotIndex];
    const img = this._imageCache[slot.imageId];
    if (!img) return;

    // Calculate cover dimensions
    const isRotated = (slot.rotation === 90 || slot.rotation === 270);
    const imgW = isRotated ? img.naturalHeight : img.naturalWidth;
    const imgH = isRotated ? img.naturalWidth : img.naturalHeight;
    const { drawW, drawH } = this._calcCover(imgW, imgH, slotDef.w, slotDef.h, slot.zoom);

    const maxPanX = Math.max(0, (drawW - slotDef.w) / 2);
    const maxPanY = Math.max(0, (drawH - slotDef.h) / 2);

    slot.panX = Math.max(-maxPanX, Math.min(maxPanX, slot.panX));
    slot.panY = Math.max(-maxPanY, Math.min(maxPanY, slot.panY));
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
        <button class="pl-prop-btn" id="btnRotateSlot">↻ Xoay ảnh</button>
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
      sData.rotation = ((sData.rotation || 0) + 90) % 360;
      this._renderCanvas();
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

_renderCanvas() {
    this._drawToCanvas(this.canvas, true);


  }
,

_drawToCanvas(canvas, isPreview, overrideTemplate = null, isPreviewSwiper = false) {
    const tmpl = overrideTemplate || ALL_TEMPLATES[this.currentTemplate];
    const w = tmpl.canvas_width || A5_WIDTH;
    const h = tmpl.canvas_height || A5_HEIGHT;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    // Layer 1 (Background)
    ctx.fillStyle = tmpl.background_color || '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (isPreviewSwiper && tmpl.background_image) {
       // async draw for swiper
       const bgImg = new Image();
       bgImg.onload = () => { ctx.drawImage(bgImg, 0, 0, w, h); };
       bgImg.src = tmpl.background_image;
       if (bgImg.complete && bgImg.naturalWidth > 0) ctx.drawImage(bgImg, 0, 0, w, h);
    } else if (this.bgImageObj && !overrideTemplate) {
       ctx.drawImage(this.bgImageObj, 0, 0, w, h);
    }

    // Draw slots (layer 2)
    for (let i = 0; i < tmpl.slots.length; i++) {
      const slotDef = tmpl.slots[i];
      const slotData = (overrideTemplate || step === 1) ? null : this.slots[i]; // If rendering swiper preview or step 1, no slots data

      ctx.save();
      ctx.translate(slotDef.cx, slotDef.cy);
      if (slotDef.rotation) {
        ctx.rotate(slotDef.rotation);
      }

      if (slotData && slotData.imageId && this._imageCache[slotData.imageId]) {
        // Draw assigned user photo
        const img = this._imageCache[slotData.imageId];
        this._drawImageInSlot(ctx, img, slotDef, slotData);
      } else if (step === 1 || isPreviewSwiper) {
        // Fill default image in Step 1 or swiper thumbnail
        let defaultImgToDraw = null;
        if (isPreviewSwiper) {
           // Always use default images for swiper previews
        }
        if (!defaultImgToDraw && this.defaultPreviewImages && this.defaultPreviewImages.length > 0) {
           const d = this.defaultPreviewImages[i % this.defaultPreviewImages.length];
           if (d.complete && d.naturalWidth > 0) defaultImgToDraw = d;
        }

        if (defaultImgToDraw) {
           this._drawImageInSlot(ctx, defaultImgToDraw, slotDef, { zoom: 1.0, panX: 0, panY: 0, rotation: 0 });
        } else {
           // Fallback loading state
           ctx.fillStyle = '#e4e4e7';
           ctx.fillRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
        }
      } else {
        // Empty slot in Step 2 or 3
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

      ctx.restore();
    }

    // Draw Overlay Frame (layer 3)
    if (isPreviewSwiper && tmpl.frame_url) {
       // In swiper, we need to load and draw the frame independently if it's an override
       const frameImg = new Image();
       frameImg.onload = () => { ctx.drawImage(frameImg, 0, 0, w, h); };
       frameImg.src = tmpl.frame_url;
       // Synchronous draw if it happens to be loaded
       if (frameImg.complete && frameImg.naturalWidth > 0) ctx.drawImage(frameImg, 0, 0, w, h);
    } else if (this.frameImageObj && !overrideTemplate) {
      ctx.drawImage(this.frameImageObj, 0, 0, w, h);
    }

    // Draw active slot highlight OVER the frame (layer 4)
    if (isPreview && this.selectedSlotIndex >= 0 && step !== 1 && step !== 4 && !isPreviewSwiper) {
       const s = tmpl.slots[this.selectedSlotIndex];
       if (s) {
         ctx.save();
         ctx.translate(s.cx, s.cy);
         if (s.rotation) ctx.rotate(s.rotation);
         ctx.strokeStyle = '#38bdf8';
         ctx.lineWidth = 12; // Thicker so it's very obvious
         ctx.strokeRect(-s.w/2, -s.h/2, s.w, s.h);
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 4;
         ctx.strokeRect(-s.w/2 + 6, -s.h/2 + 6, s.w - 12, s.h - 12);
         ctx.restore();
       }
    }
  }
,

_drawImageInSlot(ctx, img, slotDef, slotData) {
    const isRotated = (slotData.rotation === 90 || slotData.rotation === 270);
    const imgW = isRotated ? img.naturalHeight : img.naturalWidth;
    const imgH = isRotated ? img.naturalWidth : img.naturalHeight;

    const { drawW, drawH } = this._calcCover(
      imgW, imgH,
      slotDef.w, slotDef.h,
      slotData.zoom
    );

    // Clip to slot
    ctx.save();
    ctx.beginPath();
    ctx.rect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
    ctx.clip();
    
    // Translate to pan position
    ctx.translate(slotData.panX, slotData.panY);
    
    if (slotData.rotation) {
      ctx.rotate(slotData.rotation * Math.PI / 180);
    }
    
    if (isRotated) {
      ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
    } else {
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    
    ctx.restore();
  }

  // ══════════════════════════════════════
  // Export
  // ══════════════════════════════════════
,

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
,

async _uploadFinalFrame() {
    if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) return;
    return new Promise((resolve) => {
      try {
        const exportCanvas = document.createElement('canvas');
        this._drawToCanvas(exportCanvas, false);
        exportCanvas.toBlob(async (blob) => {
          if (!blob) return resolve();
          const branch = localStorage.getItem('branchId') || 'CN01';
          const session = this.rooms[this.activeRoom].session;
          const formData = new FormData();
          formData.append('image', blob, '00_frame.jpg');
          try {
            await fetch(`/api/stream-upload/${branch}/${this.activeRoom}/${session}`, {
              method: 'POST',
              body: formData
            });
          } catch (err) {
            console.error('Upload final frame failed:', err);
          }
          resolve();
        }, 'image/jpeg', 0.95);
      } catch (err) {
        console.error('Upload final frame error:', err);
        resolve();
      }
    });
  }
,

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
,

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
