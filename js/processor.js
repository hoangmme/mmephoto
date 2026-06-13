// ============================================
// PhotoTune Pro — Image Processing Engine
// ============================================
// Lightroom-style per-pixel + spatial adjustments
// Pipeline: Exposure → Contrast → Highlights/Shadows → Whites/Blacks
//           → Temperature/Tint → Vibrance → Saturation → Hue
//           → LUT → NoiseReduction → Texture → Clarity → Dehaze → Sharpness

import { applyLUT } from './lut-parser.js';

const MAX_PREVIEW = 1400; // Max preview dimension

export class ImageProcessor {
  constructor() {
    this.offscreen = document.createElement('canvas');
    this.offCtx = this.offscreen.getContext('2d', { willReadFrequently: true });
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Load an image file and return { original, preview, width, height }
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Full-resolution original
        this.offscreen.width = w;
        this.offscreen.height = h;
        this.offCtx.drawImage(img, 0, 0);
        const originalData = this.offCtx.getImageData(0, 0, w, h);

        // Preview (downscaled for performance)
        let pw = w, ph = h;
        if (Math.max(w, h) > MAX_PREVIEW) {
          const scale = MAX_PREVIEW / Math.max(w, h);
          pw = Math.round(w * scale);
          ph = Math.round(h * scale);
        }

        this.tempCanvas.width = pw;
        this.tempCanvas.height = ph;
        this.tempCtx.drawImage(img, 0, 0, pw, ph);
        const previewData = this.tempCtx.getImageData(0, 0, pw, ph);

        URL.revokeObjectURL(img.src);
        resolve({
          originalData,
          previewData,
          fullWidth: w,
          fullHeight: h,
          previewWidth: pw,
          previewHeight: ph
        });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process image data with given parameters.
   * @param {ImageData} sourceData
   * @param {Object} params - Slider parameters
   * @param {Object|null} lut - Parsed LUT object (optional)
   * @param {number} lutIntensity - 0-100, LUT blend strength
   * Returns new ImageData.
   */
  process(sourceData, params, lut = null, lutIntensity = 100) {
    const w = sourceData.width;
    const h = sourceData.height;
    const src = sourceData.data;

    // Clone pixel data
    const dst = new Uint8ClampedArray(src);

    // ── Pass 1: Per-pixel adjustments ──
    this._applyPerPixel(dst, w, h, params);

    // ── Pass 1.5: Apply LUT (after color adjustments, before spatial) ──
    if (lut && lutIntensity > 0) {
      applyLUT(dst, lut, lutIntensity / 100);
    }

    // ── Pass 2: Spatial filters ──
    let result = new ImageData(dst, w, h);

    if (params.noiseReduction !== 0) {
      result = this._applyNoiseReduction(result, params.noiseReduction);
    }
    if (params.texture !== 0) {
      result = this._applyUnsharpMask(result, 1, params.texture / 100, 'texture');
    }
    if (params.clarity !== 0) {
      result = this._applyUnsharpMask(result, 8, params.clarity / 80, 'clarity');
    }
    if (params.dehaze !== 0) {
      result = this._applyDehaze(result, params.dehaze);
    }
    if (params.sharpness !== 0) {
      result = this._applyUnsharpMask(result, 1, params.sharpness / 60, 'sharpen');
    }

    return result;
  }

  /**
   * Per-pixel adjustments (single pass through all pixels)
   */
  _applyPerPixel(data, w, h, p) {
    const len = data.length;

    // Pre-compute factors
    const expFactor = Math.pow(2, p.exposure / 80);
    const contFactor = 1 + p.contrast / 100;
    const highlightAmt = p.highlights / 100;
    const shadowAmt = p.shadows / 100;
    const whiteAmt = p.whites / 100;
    const blackAmt = p.blacks / 100;
    const tempAmt = p.temperature;
    const tintAmt = p.tint;
    const vibAmt = p.vibrance / 100;
    const satFactor = 1 + p.saturation / 100;
    const hueShift = p.hue;

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      // Alpha stays unchanged

      // ── Exposure ──
      if (p.exposure !== 0) {
        r *= expFactor;
        g *= expFactor;
        b *= expFactor;
      }

      // ── Contrast ──
      if (p.contrast !== 0) {
        r = (r / 255 - 0.5) * contFactor * 255 + 127.5;
        g = (g / 255 - 0.5) * contFactor * 255 + 127.5;
        b = (b / 255 - 0.5) * contFactor * 255 + 127.5;
      }

      // Luminance for tonal adjustments
      let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // ── Highlights ──
      if (p.highlights !== 0 && lum > 128) {
        const blend = (lum - 128) / 127;
        const adj = highlightAmt * blend * 60;
        r += adj;
        g += adj;
        b += adj;
      }

      // ── Shadows ──
      if (p.shadows !== 0 && lum < 128) {
        const blend = 1 - lum / 128;
        const adj = shadowAmt * blend * 60;
        r += adj;
        g += adj;
        b += adj;
      }

      // ── Whites ──
      if (p.whites !== 0) {
        const blend = Math.pow(Math.min(lum, 255) / 255, 2.5);
        const adj = whiteAmt * blend * 50;
        r += adj;
        g += adj;
        b += adj;
      }

      // ── Blacks ──
      if (p.blacks !== 0) {
        const blend = Math.pow(1 - Math.min(lum, 255) / 255, 2.5);
        const adj = blackAmt * blend * 50;
        r += adj;
        g += adj;
        b += adj;
      }

      // ── Temperature (warm = +R -B, cool = -R +B) ──
      if (p.temperature !== 0) {
        r += tempAmt * 0.35;
        g += tempAmt * 0.05;
        b -= tempAmt * 0.35;
      }

      // ── Tint (+ = magenta/pink, - = green) ──
      if (p.tint !== 0) {
        r += tintAmt * 0.15;
        g -= tintAmt * 0.25;
        b += tintAmt * 0.15;
      }

      // Clamp before HSL conversion
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // ── Vibrance, Saturation, Hue (operate in HSL) ──
      if (p.vibrance !== 0 || p.saturation !== 0 || p.hue !== 0) {
        let [hh, ss, ll] = rgbToHsl(r, g, b);

        // Vibrance: boost low-saturation colors more
        if (p.vibrance !== 0) {
          const boost = vibAmt * (1 - ss);
          ss = Math.max(0, Math.min(1, ss + boost * 0.5));
        }

        // Saturation
        if (p.saturation !== 0) {
          ss = Math.max(0, Math.min(1, ss * satFactor));
        }

        // Hue
        if (p.hue !== 0) {
          hh = (hh + hueShift / 360 + 1) % 1;
        }

        [r, g, b] = hslToRgb(hh, ss, ll);
      }

      // Final clamp
      data[i] = Math.max(0, Math.min(255, r + 0.5)) | 0;
      data[i + 1] = Math.max(0, Math.min(255, g + 0.5)) | 0;
      data[i + 2] = Math.max(0, Math.min(255, b + 0.5)) | 0;
    }
  }

  /**
   * Noise Reduction: simple box blur on luminance
   */
  _applyNoiseReduction(imageData, amount) {
    const radius = Math.max(1, Math.round(amount / 20));
    return this._boxBlurImageData(imageData, radius);
  }

  /**
   * Unsharp Mask for Sharpness, Texture, and Clarity
   * mode: 'sharpen' | 'texture' | 'clarity'
   */
  _applyUnsharpMask(imageData, radius, amount, mode) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const blurred = this._boxBlurImageData(
      new ImageData(new Uint8ClampedArray(src), w, h),
      radius
    );
    const blurData = blurred.data;
    const result = new Uint8ClampedArray(src);

    for (let i = 0; i < src.length; i += 4) {
      let mask = 1; // default: apply everywhere

      if (mode === 'clarity') {
        // Apply mainly to midtones
        const lum = (src[i] * 0.2126 + src[i+1] * 0.7152 + src[i+2] * 0.0722) / 255;
        mask = 1 - Math.abs(lum - 0.5) * 2;
        mask = Math.pow(mask, 0.7);
      }

      for (let c = 0; c < 3; c++) {
        const diff = src[i + c] - blurData[i + c];
        result[i + c] = Math.max(0, Math.min(255,
          src[i + c] + diff * amount * mask
        ));
      }
      result[i + 3] = src[i + 3];
    }

    return new ImageData(result, w, h);
  }

  /**
   * Dehaze: simplified dark channel prior
   */
  _applyDehaze(imageData, amount) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const result = new Uint8ClampedArray(src);
    const strength = amount / 100;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], g = src[i+1], b = src[i+2];
      const minCh = Math.min(r, g, b) / 255;

      // Transmission estimation
      const t = Math.max(0.15, 1 - strength * minCh * 0.9);
      const A = 240; // atmospheric light estimate

      result[i]   = Math.max(0, Math.min(255, ((r - A * (1 - t)) / t)));
      result[i+1] = Math.max(0, Math.min(255, ((g - A * (1 - t)) / t)));
      result[i+2] = Math.max(0, Math.min(255, ((b - A * (1 - t)) / t)));
      result[i+3] = src[i+3];
    }

    return new ImageData(result, w, h);
  }

  /**
   * Fast box blur using running-sum (horizontal + vertical passes)
   */
  _boxBlurImageData(imageData, radius) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const temp = new Uint8ClampedArray(src.length);
    const dst = new Uint8ClampedArray(src.length);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        let count = 0;

        // Initialize window
        for (let x = 0; x <= radius && x < w; x++) {
          sum += src[(y * w + x) * 4 + c];
          count++;
        }
        temp[y * w * 4 + c] = (sum / count) | 0;

        for (let x = 1; x < w; x++) {
          // Add right pixel
          if (x + radius < w) {
            sum += src[(y * w + x + radius) * 4 + c];
            count++;
          }
          // Remove left pixel
          if (x - radius - 1 >= 0) {
            sum -= src[(y * w + x - radius - 1) * 4 + c];
            count--;
          }
          temp[(y * w + x) * 4 + c] = (sum / count) | 0;
        }
      }
    }

    // Vertical pass
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        let count = 0;

        for (let y = 0; y <= radius && y < h; y++) {
          sum += temp[(y * w + x) * 4 + c];
          count++;
        }
        dst[x * 4 + c] = (sum / count) | 0;

        for (let y = 1; y < h; y++) {
          if (y + radius < h) {
            sum += temp[((y + radius) * w + x) * 4 + c];
            count++;
          }
          if (y - radius - 1 >= 0) {
            sum -= temp[((y - radius - 1) * w + x) * 4 + c];
            count--;
          }
          dst[(y * w + x) * 4 + c] = (sum / count) | 0;
        }
      }
    }

    return new ImageData(dst, w, h);
  }

  /**
   * Export processed image at full resolution
   */
  exportImage(originalData, params, format, quality, resizeW, resizeH, lut = null, lutIntensity = 100) {
    // Process at full resolution
    const processed = this.process(originalData, params, lut, lutIntensity);
    const w = processed.width;
    const h = processed.height;

    // Draw to offscreen canvas
    this.offscreen.width = w;
    this.offscreen.height = h;
    this.offCtx.putImageData(processed, 0, 0);

    // Resize if needed
    let exportCanvas = this.offscreen;
    if (resizeW && resizeH && (resizeW !== w || resizeH !== h)) {
      this.tempCanvas.width = resizeW;
      this.tempCanvas.height = resizeH;
      this.tempCtx.drawImage(this.offscreen, 0, 0, resizeW, resizeH);
      exportCanvas = this.tempCanvas;
    }

    // Export
    const mimeType = format === 'png' ? 'image/png' :
                     format === 'webp' ? 'image/webp' : 'image/jpeg';
    const q = format === 'png' ? undefined : quality / 100;

    return exportCanvas.toDataURL(mimeType, q);
  }
}


// ── Color conversion helpers ──

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}
