/**
 * CanvasRenderer.js
 * High-performance Canvas rendering engine for Photobooth templates, slots, and HiDPI exports.
 */

import { ALL_TEMPLATES, A5_WIDTH, A5_HEIGHT } from '../modules/pl-globals.js?v=175';

export class CanvasRenderer {
  static calcCover(imgW, imgH, slotW, slotH, zoom = 1.0) {
    const imgRatio = imgW / imgH;
    const slotRatio = slotW / slotH;
    let baseW, baseH;

    if (imgRatio > slotRatio) {
      baseH = slotH;
      baseW = slotH * imgRatio;
    } else {
      baseW = slotW;
      baseH = slotW / imgRatio;
    }

    return {
      drawW: baseW * zoom,
      drawH: baseH * zoom
    };
  }

  static drawImageInSlot(ctx, img, slotDef, slotData) {
    const zoom = slotData ? (slotData.zoom || 1.0) : 1.0;
    const { drawW, drawH } = this.calcCover(img.naturalWidth, img.naturalHeight, slotDef.w, slotDef.h, zoom);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-slotDef.w / 2, -slotDef.h / 2, slotDef.w, slotDef.h);
    ctx.clip();

    if (slotData) {
      ctx.translate(slotData.panX || 0, slotData.panY || 0);
      if (slotData.rotation) {
        ctx.rotate(slotData.rotation * Math.PI / 180);
      }
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  static drawToCanvas(canvas, state = {}) {
    const {
      currentTemplate = null,
      overrideTemplate = null,
      slots = [],
      selectedSlotIndex = -1,
      imageCache = {},
      bgImageObj = null,
      frameImageObj = null,
      defaultPreviewImages = [],
      isPreview = true,
      currentStep = 1,
      isPreviewSwiper = false
    } = state;

    let tmpl = overrideTemplate || ALL_TEMPLATES[currentTemplate];
    if (!tmpl) {
      const fallbackKey = Object.keys(ALL_TEMPLATES)[0];
      tmpl = ALL_TEMPLATES[fallbackKey];
    }
    if (!tmpl) return;

    const w = tmpl.canvas_width || A5_WIDTH;
    const h = tmpl.canvas_height || A5_HEIGHT;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Layer 1: Background
    ctx.fillStyle = tmpl.background_color || '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (bgImageObj && !overrideTemplate) {
      ctx.drawImage(bgImageObj, 0, 0, w, h);
    }

    // Layer 2: Slots
    for (let i = 0; i < tmpl.slots.length; i++) {
      const slotDef = tmpl.slots[i];
      const slotData = (overrideTemplate || currentStep === 1) ? null : slots[i];

      ctx.save();
      ctx.translate(slotDef.cx, slotDef.cy);
      if (slotDef.rotation) {
        ctx.rotate(slotDef.rotation);
      }

      if (slotData && slotData.imageId) {
        const cachedImg = imageCache[slotData.imageId];
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          this.drawImageInSlot(ctx, cachedImg, slotDef, slotData);
        } else {
          ctx.fillStyle = '#e4e4e7';
          ctx.fillRect(-slotDef.w / 2, -slotDef.h / 2, slotDef.w, slotDef.h);
        }
      } else if (currentStep === 1 || isPreviewSwiper) {
        let defaultImg = defaultPreviewImages[i % Math.max(1, defaultPreviewImages.length)];
        if (defaultImg && defaultImg.complete && defaultImg.naturalWidth > 0) {
          this.drawImageInSlot(ctx, defaultImg, slotDef, { zoom: 1.0, panX: 0, panY: 0, rotation: 0 });
        } else {
          ctx.fillStyle = '#e4e4e7';
          ctx.fillRect(-slotDef.w / 2, -slotDef.h / 2, slotDef.w, slotDef.h);
        }
      } else {
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(-slotDef.w / 2, -slotDef.h / 2, slotDef.w, slotDef.h);
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(-slotDef.w / 2, -slotDef.h / 2, slotDef.w, slotDef.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Slot ${i + 1}`, 0, 0);
      }

      ctx.restore();
    }

    // Layer 3: Overlay Frame
    if (frameImageObj && !overrideTemplate) {
      ctx.drawImage(frameImageObj, 0, 0, w, h);
    }

    // Layer 4: Active Slot Highlight & Canva Controls
    if (isPreview && selectedSlotIndex >= 0 && currentStep !== 1 && currentStep !== 4 && !isPreviewSwiper) {
      const s = tmpl.slots[selectedSlotIndex];
      const slotData = slots ? slots[selectedSlotIndex] : null;
      if (s) {
        ctx.save();
        ctx.translate(s.cx, s.cy);
        if (s.rotation) ctx.rotate(s.rotation);

        const slotW = s.w;
        const slotH = s.h;

        // Glowing Cyan Border
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 6;
        ctx.shadowColor = 'rgba(2, 132, 199, 0.7)';
        ctx.shadowBlur = 14;
        ctx.strokeRect(-slotW / 2, -slotH / 2, slotW, slotH);
        ctx.shadowBlur = 0;

        // Inner white dashed line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(-slotW / 2, -slotH / 2, slotW, slotH);
        ctx.setLineDash([]);

        // 4 Corner Handles
        [
          { x: -slotW / 2, y: -slotH / 2 },
          { x: slotW / 2, y: -slotH / 2 },
          { x: -slotW / 2, y: slotH / 2 },
          { x: slotW / 2, y: slotH / 2 }
        ].forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 4;
          ctx.stroke();
        });

        // Canva Rotate Handle
        const isNearBottom = (s.cy + (slotData ? (slotData.panY || 0) : 0) + slotH / 2 + 110 > h - 40);
        const handleSign = isNearBottom ? -1 : 1;
        const handleOffsetY = handleSign * (slotH / 2 + 85);

        ctx.beginPath();
        ctx.moveTo(0, handleSign * (slotH / 2));
        ctx.lineTo(0, handleOffsetY);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, handleOffsetY, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, handleOffsetY, 20, -Math.PI * 0.75, Math.PI * 0.75);
        ctx.stroke();

        // Rotation Angle Pill Badge
        const currentDeg = Math.round(((slotData ? (slotData.rotation || 0) : 0) % 360 + 360) % 360) + '°';
        ctx.font = 'bold 38px Inter, system-ui, sans-serif';
        const textMetrics = ctx.measureText(currentDeg);
        const badgeW = textMetrics.width + 36;
        const badgeH = 54;
        const badgeY = handleOffsetY + (isNearBottom ? -75 : 75);

        ctx.save();
        ctx.fillStyle = 'rgba(2, 132, 199, 0.95)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 14);
        else ctx.rect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentDeg, 0, badgeY);
        ctx.restore();

        ctx.restore();
      }
    }
  }
}
