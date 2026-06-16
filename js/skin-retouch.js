// ============================================
// MME Color Lab — Skin Retouch Engine
// ============================================
// AI-powered skin retouching using MediaPipe Face Landmarker
// Pipeline: Face Detection → Mask Generation → Smooth → Whiten → Texture Recovery → Lip → Eye

// Retouch presets
export const RETOUCH_PRESETS = {
  light:  { skinSmooth: 20, skinWhitening: 10, skinTexture: 60, lipEnhance: 6,  eyeBrighten: 5  },
  medium: { skinSmooth: 35, skinWhitening: 18, skinTexture: 40, lipEnhance: 12, eyeBrighten: 8  },
  strong: { skinSmooth: 50, skinWhitening: 25, skinTexture: 25, lipEnhance: 18, eyeBrighten: 12 }
};

export const DEFAULT_RETOUCH = {
  skinSmooth: 0,
  skinWhitening: 0,
  skinTexture: 0,
  lipEnhance: 0,
  eyeBrighten: 0
};

// MediaPipe Face Landmarker landmark indices for regions
// Face oval (outer contour for skin mask)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

// Left eye contour (exclude from skin mask)
const LEFT_EYE = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
];

// Right eye contour (exclude from skin mask)
const RIGHT_EYE = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
];

// Left eyebrow (exclude from skin mask)
const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];

// Right eyebrow (exclude from skin mask)
const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

// Lips outer contour (for lip mask)
const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
  409, 270, 269, 267, 0, 37, 39, 40, 185
];

// Lips inner (exclude from skin mask)
const LIPS_INNER = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
  415, 310, 311, 312, 13, 82, 81, 80, 191
];

// Nose bottom (nostrils - exclude from skin)
const NOSE_BOTTOM = [
  2, 326, 97, 98, 327, 168
];

// Eye region for brightening (slightly larger than eye contour)
const LEFT_EYE_REGION = [
  33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7
];
const RIGHT_EYE_REGION = [
  362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382
];


export class SkinRetoucher {
  constructor() {
    this.faceLandmarker = null;
    this.isInitializing = false;
    this.isReady = false;
    this._initPromise = null;

    // Cache canvases for mask generation
    this._maskCanvas = document.createElement('canvas');
    this._maskCtx = this._maskCanvas.getContext('2d', { willReadFrequently: true });
    this._tempCanvas = document.createElement('canvas');
    this._tempCtx = this._tempCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Lazy-initialize MediaPipe Face Landmarker
   */
  async init() {
    if (this.isReady) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    try {
      this.isInitializing = true;

      const { FaceLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
      );

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        numFaces: 5,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Face Landmarker:', err);
      this.isInitializing = false;
      this._initPromise = null;
      return false;
    }
  }

  /**
   * Check if any retouch param is active
   */
  isActive(params) {
    return params.skinSmooth > 0 || params.skinWhitening > 0 ||
           params.lipEnhance > 0 || params.eyeBrighten > 0;
  }

  /**
   * Main processing pipeline
   * @param {ImageData} imageData - Input image data
   * @param {Object} params - Retouch parameters
   * @returns {{ result: ImageData, faceDetected: boolean }}
   */
  async process(imageData, params) {
    if (!this.isActive(params)) {
      return { result: imageData, faceDetected: false };
    }

    // Ensure initialized
    if (!this.isReady) {
      const ok = await this.init();
      if (!ok) return { result: imageData, faceDetected: false };
    }

    // Detect faces
    const detection = this._detectFaces(imageData);
    if (!detection || detection.length === 0) {
      return { result: imageData, faceDetected: false };
    }

    const w = imageData.width;
    const h = imageData.height;

    // Generate masks for all detected faces (combined)
    const masks = this._generateMasks(detection, w, h);

    // Clone image data for processing
    const dst = new Uint8ClampedArray(imageData.data);

    // Apply skin smooth
    if (params.skinSmooth > 0) {
      this._applySkinSmooth(dst, w, h, masks.skin, params.skinSmooth);
    }

    // Apply skin whitening
    if (params.skinWhitening > 0) {
      this._applySkinWhitening(dst, w, h, masks.skin, params.skinWhitening);
    }

    // Apply texture recovery (blend back high-frequency from original)
    if (params.skinSmooth > 0 && params.skinTexture > 0) {
      this._applyTextureRecovery(dst, imageData.data, w, h, masks.skin, params.skinTexture);
    }

    // Apply lip enhance
    if (params.lipEnhance > 0) {
      this._applyLipEnhance(dst, w, h, masks.lip, params.lipEnhance);
    }

    // Apply eye brighten
    if (params.eyeBrighten > 0) {
      this._applyEyeBrighten(dst, w, h, masks.eye, params.eyeBrighten);
    }

    return {
      result: new ImageData(dst, w, h),
      faceDetected: true
    };
  }

  // ── Face Detection ──

  _detectFaces(imageData) {
    try {
      // Draw to canvas for MediaPipe
      this._maskCanvas.width = imageData.width;
      this._maskCanvas.height = imageData.height;
      this._maskCtx.putImageData(imageData, 0, 0);

      const result = this.faceLandmarker.detect(this._maskCanvas);
      if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
        return null;
      }
      return result.faceLandmarks; // Array of face landmark arrays
    } catch (err) {
      console.error('Face detection error:', err);
      return null;
    }
  }

  // ── Mask Generation ──

  _generateMasks(faceLandmarksArray, w, h) {
    // Create separate mask canvases
    const skinMask = new Uint8Array(w * h);
    const lipMask = new Uint8Array(w * h);
    const eyeMask = new Uint8Array(w * h);

    for (const landmarks of faceLandmarksArray) {
      // Skin mask: face oval minus eyes, eyebrows, lips, nose
      this._fillPolygonToMask(skinMask, landmarks, FACE_OVAL, w, h, 255);
      // Subtract exclusion zones
      this._fillPolygonToMask(skinMask, landmarks, LEFT_EYE, w, h, 0);
      this._fillPolygonToMask(skinMask, landmarks, RIGHT_EYE, w, h, 0);
      this._fillPolygonToMask(skinMask, landmarks, LEFT_EYEBROW, w, h, 0);
      this._fillPolygonToMask(skinMask, landmarks, RIGHT_EYEBROW, w, h, 0);
      this._fillPolygonToMask(skinMask, landmarks, LIPS_OUTER, w, h, 0);

      // Lip mask
      this._fillPolygonToMask(lipMask, landmarks, LIPS_OUTER, w, h, 255);
      // Subtract inner mouth
      this._fillPolygonToMask(lipMask, landmarks, LIPS_INNER, w, h, 0);

      // Eye mask
      this._fillPolygonToMask(eyeMask, landmarks, LEFT_EYE_REGION, w, h, 255);
      this._fillPolygonToMask(eyeMask, landmarks, RIGHT_EYE_REGION, w, h, 255);
    }

    // Feather/blur the skin mask edges for smooth blending
    this._blurMask(skinMask, w, h, 5);
    this._blurMask(lipMask, w, h, 3);
    this._blurMask(eyeMask, w, h, 2);

    return { skin: skinMask, lip: lipMask, eye: eyeMask };
  }

  _fillPolygonToMask(mask, landmarks, indices, w, h, value) {
    // Use canvas to draw polygon and read back
    this._tempCanvas.width = w;
    this._tempCanvas.height = h;
    const ctx = this._tempCtx;
    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    for (let i = 0; i < indices.length; i++) {
      const lm = landmarks[indices[i]];
      const x = lm.x * w;
      const y = lm.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = value > 0 ? 'white' : 'black';
    ctx.fill();

    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    for (let i = 0; i < w * h; i++) {
      const alpha = pixels[i * 4]; // Red channel (white = 255, black = 0)
      if (value > 0) {
        if (alpha > 128) mask[i] = value;
      } else {
        if (alpha > 128) mask[i] = 0;
      }
    }
  }

  _blurMask(mask, w, h, radius) {
    // Simple box blur on mask for feathering edges
    const temp = new Uint8Array(mask.length);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < w) {
            sum += mask[y * w + nx];
            count++;
          }
        }
        temp[y * w + x] = (sum / count) | 0;
      }
    }

    // Vertical pass
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < h) {
            sum += temp[ny * w + x];
            count++;
          }
        }
        mask[y * w + x] = (sum / count) | 0;
      }
    }
  }

  // ── Skin Smooth (Edge-preserving bilateral-like filter) ──

  _applySkinSmooth(data, w, h, skinMask, amount) {
    const strength = amount / 100;
    const radius = Math.max(2, Math.round(strength * 6));
    const sigmaRange = 20 + strength * 15; // Color distance threshold

    // Only process pixels inside skin mask
    const src = new Uint8ClampedArray(data);

    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        const idx = y * w + x;
        const maskVal = skinMask[idx] / 255;
        if (maskVal < 0.05) continue;

        const pi = idx * 4;
        const cr = src[pi], cg = src[pi + 1], cb = src[pi + 2];

        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

        // Sample in a cross pattern for performance
        const step = Math.max(1, Math.floor(radius / 3));
        for (let dy = -radius; dy <= radius; dy += step) {
          for (let dx = -radius; dx <= radius; dx += step) {
            const ni = ((y + dy) * w + (x + dx)) * 4;
            const nr = src[ni], ng = src[ni + 1], nb = src[ni + 2];

            // Color distance (edge-preserving)
            const colorDist = Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb);
            const colorW = Math.exp(-(colorDist * colorDist) / (2 * sigmaRange * sigmaRange));

            // Spatial distance
            const spatialDist = dx * dx + dy * dy;
            const spatialW = Math.exp(-spatialDist / (2 * radius * radius));

            const w2 = colorW * spatialW;
            sumR += nr * w2;
            sumG += ng * w2;
            sumB += nb * w2;
            sumW += w2;
          }
        }

        if (sumW > 0) {
          const blendFactor = maskVal * strength;
          data[pi]     = cr + (sumR / sumW - cr) * blendFactor;
          data[pi + 1] = cg + (sumG / sumW - cg) * blendFactor;
          data[pi + 2] = cb + (sumB / sumW - cb) * blendFactor;
        }
      }
    }
  }

  // ── Skin Whitening (LAB L-channel boost in skin region) ──

  _applySkinWhitening(data, w, h, skinMask, amount) {
    const strength = amount / 100;

    for (let i = 0; i < w * h; i++) {
      const maskVal = skinMask[i] / 255;
      if (maskVal < 0.05) continue;

      const pi = i * 4;
      let r = data[pi], g = data[pi + 1], b = data[pi + 2];

      // Convert to LAB (simplified)
      const lab = this._rgbToLab(r, g, b);

      // Boost L channel, clamp at 92 to prevent blowout
      const deltaL = strength * 12;
      lab[0] = Math.min(92, lab[0] + deltaL * maskVal);

      // Slightly reduce saturation for cleaner look
      const desatAmount = strength * 0.06 * maskVal;
      lab[1] *= (1 - desatAmount);
      lab[2] *= (1 - desatAmount);

      // Convert back
      const rgb = this._labToRgb(lab[0], lab[1], lab[2]);

      data[pi]     = rgb[0];
      data[pi + 1] = rgb[1];
      data[pi + 2] = rgb[2];
    }
  }

  // ── Texture Recovery (High-frequency blend back) ──

  _applyTextureRecovery(data, originalData, w, h, skinMask, amount) {
    const recovery = amount / 100;

    // Generate blurred version of original for high-pass extraction
    const blurred = this._fastBlur(originalData, w, h, 2);

    for (let i = 0; i < w * h; i++) {
      const maskVal = skinMask[i] / 255;
      if (maskVal < 0.05) continue;

      const pi = i * 4;

      for (let c = 0; c < 3; c++) {
        // High frequency = original - blurred
        const highFreq = originalData[pi + c] - blurred[pi + c];

        // Add high frequency back to smoothed result
        data[pi + c] = Math.max(0, Math.min(255,
          data[pi + c] + highFreq * recovery * maskVal * 0.5
        ));
      }
    }
  }

  // ── Lip Enhance (Saturation + pink shift in lip region) ──

  _applyLipEnhance(data, w, h, lipMask, amount) {
    const strength = amount / 100;

    for (let i = 0; i < w * h; i++) {
      const maskVal = lipMask[i] / 255;
      if (maskVal < 0.05) continue;

      const pi = i * 4;
      let r = data[pi], g = data[pi + 1], b = data[pi + 2];

      // Convert to HSL
      const hsl = this._rgbToHsl(r, g, b);

      // Boost saturation toward pink/red
      const satBoost = strength * 0.15 * maskVal;
      hsl[1] = Math.min(1, hsl[1] + satBoost);

      // Slight hue shift toward pink (+3 degrees)
      hsl[0] = (hsl[0] + (3 / 360) * strength * maskVal) % 1;

      const rgb = this._hslToRgb(hsl[0], hsl[1], hsl[2]);

      // Blend with low opacity for natural look
      const blend = 0.4 * maskVal * strength;
      data[pi]     = r + (rgb[0] - r) * blend;
      data[pi + 1] = g + (rgb[1] - g) * blend;
      data[pi + 2] = b + (rgb[2] - b) * blend;
    }
  }

  // ── Eye Brighten (Brightness + contrast + sharpen in eye region) ──

  _applyEyeBrighten(data, w, h, eyeMask, amount) {
    const strength = amount / 100;

    for (let i = 0; i < w * h; i++) {
      const maskVal = eyeMask[i] / 255;
      if (maskVal < 0.05) continue;

      const pi = i * 4;
      let r = data[pi], g = data[pi + 1], b = data[pi + 2];

      // Brightness boost
      const brightBoost = 1 + strength * 0.12 * maskVal;
      r *= brightBoost;
      g *= brightBoost;
      b *= brightBoost;

      // Contrast boost (mild)
      const contFactor = 1 + strength * 0.08 * maskVal;
      r = (r / 255 - 0.5) * contFactor * 255 + 127.5;
      g = (g / 255 - 0.5) * contFactor * 255 + 127.5;
      b = (b / 255 - 0.5) * contFactor * 255 + 127.5;

      data[pi]     = Math.max(0, Math.min(255, r));
      data[pi + 1] = Math.max(0, Math.min(255, g));
      data[pi + 2] = Math.max(0, Math.min(255, b));
    }
  }

  // ══════════════════════════════════════
  // Color Space Helpers
  // ══════════════════════════════════════

  _rgbToLab(r, g, b) {
    // sRGB → XYZ → CIELAB (D65)
    r /= 255; g /= 255; b /= 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }

  _labToRgb(l, a, b) {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    const y3 = y * y * y;
    const x3 = x * x * x;
    const z3 = z * z * z;

    y = y3 > 0.008856 ? y3 : (y - 16/116) / 7.787;
    x = x3 > 0.008856 ? x3 : (x - 16/116) / 7.787;
    z = z3 > 0.008856 ? z3 : (z - 16/116) / 7.787;

    x *= 0.95047;
    z *= 1.08883;

    let r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
    let bb = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    bb = bb > 0.0031308 ? 1.055 * Math.pow(bb, 1/2.4) - 0.055 : 12.92 * bb;

    return [
      Math.max(0, Math.min(255, Math.round(r * 255))),
      Math.max(0, Math.min(255, Math.round(g * 255))),
      Math.max(0, Math.min(255, Math.round(bb * 255)))
    ];
  }

  _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

  _hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }

  _fastBlur(data, w, h, radius) {
    // Simple box blur for high-pass extraction
    const len = data.length;
    const result = new Uint8ClampedArray(len);
    const temp = new Uint8ClampedArray(len);

    // Horizontal
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, count = 0;
        for (let x = 0; x <= radius && x < w; x++) {
          sum += data[(y * w + x) * 4 + c];
          count++;
        }
        temp[y * w * 4 + c] = (sum / count) | 0;

        for (let x = 1; x < w; x++) {
          if (x + radius < w) { sum += data[(y * w + x + radius) * 4 + c]; count++; }
          if (x - radius - 1 >= 0) { sum -= data[(y * w + x - radius - 1) * 4 + c]; count--; }
          temp[(y * w + x) * 4 + c] = (sum / count) | 0;
        }
      }
      // Copy alpha
      for (let x = 0; x < w; x++) {
        temp[(y * w + x) * 4 + 3] = data[(y * w + x) * 4 + 3];
      }
    }

    // Vertical
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, count = 0;
        for (let y = 0; y <= radius && y < h; y++) {
          sum += temp[(y * w + x) * 4 + c];
          count++;
        }
        result[x * 4 + c] = (sum / count) | 0;

        for (let y = 1; y < h; y++) {
          if (y + radius < h) { sum += temp[((y + radius) * w + x) * 4 + c]; count++; }
          if (y - radius - 1 >= 0) { sum -= temp[((y - radius - 1) * w + x) * 4 + c]; count--; }
          result[(y * w + x) * 4 + c] = (sum / count) | 0;
        }
      }
      for (let y = 0; y < h; y++) {
        result[(y * w + x) * 4 + 3] = temp[(y * w + x) * 4 + 3];
      }
    }

    return result;
  }
}
