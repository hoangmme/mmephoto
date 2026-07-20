// ============================================
// PhotoTune Pro — .cube LUT Parser & Applicator
// ============================================
// Supports 3D LUT files in .cube format (industry standard)
// Used by Lightroom, Premiere, DaVinci Resolve, etc.

/**
 * Parse a .cube LUT file text content.
 * Returns { title, size, domainMin, domainMax, data }
 * data is a flat Float32Array of RGB triplets (size³ × 3 values)
 */
window.parseCubeLUT = function(text) {
  const lines = text.split(/\r?\n/);
  let title = 'Untitled LUT';
  let size = 0;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const data = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Parse metadata
    if (line.startsWith('TITLE')) {
      const match = line.match(/TITLE\s+"?([^"]*)"?/i);
      if (match) title = match[1].trim() || 'Untitled LUT';
      continue;
    }

    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1]);
      if (isNaN(size) || size < 2 || size > 256) {
        throw new Error(`Invalid LUT_3D_SIZE: ${size}. Must be between 2 and 256.`);
      }
      continue;
    }

    if (line.startsWith('LUT_1D_SIZE')) {
      throw new Error('1D LUTs are not supported. Please use a 3D .cube LUT file.');
    }

    if (line.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3) domainMin = parts;
      continue;
    }

    if (line.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3) domainMax = parts;
      continue;
    }

    // Parse data lines (R G B triplets)
    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && !isNaN(parts[0])) {
      data.push(parts[0], parts[1], parts[2]);
    }
  }

  if (size === 0) {
    throw new Error('No LUT_3D_SIZE found in the .cube file.');
  }

  const expectedCount = size * size * size * 3;
  if (data.length !== expectedCount) {
    throw new Error(
      `LUT data mismatch: expected ${expectedCount / 3} entries (${size}³), got ${data.length / 3}.`
    );
  }

  return {
    title,
    size,
    domainMin,
    domainMax,
    data: new Float32Array(data)
  };
}


/**
 * Apply a 3D LUT to pixel data using trilinear interpolation.
 * 
 * @param {Uint8ClampedArray} pixels - RGBA pixel data
 * @param {Object} lut - Parsed LUT from parseCubeLUT()
 * @param {number} intensity - 0 to 1 blend factor (0 = original, 1 = full LUT)
 */
window.applyLUT = function(pixels, lut, intensity = 1) {
  const { size, data, domainMin, domainMax } = lut;
  const sizeM1 = size - 1;
  const len = pixels.length;

  // Pre-compute domain scaling
  const scaleR = 1 / (domainMax[0] - domainMin[0]);
  const scaleG = 1 / (domainMax[1] - domainMin[1]);
  const scaleB = 1 / (domainMax[2] - domainMin[2]);

  for (let i = 0; i < len; i += 4) {
    const origR = pixels[i];
    const origG = pixels[i + 1];
    const origB = pixels[i + 2];

    // Normalize to domain [0, 1]
    let nr = (origR / 255 - domainMin[0]) * scaleR;
    let ng = (origG / 255 - domainMin[1]) * scaleG;
    let nb = (origB / 255 - domainMin[2]) * scaleB;

    // Clamp to [0, 1]
    nr = Math.max(0, Math.min(1, nr));
    ng = Math.max(0, Math.min(1, ng));
    nb = Math.max(0, Math.min(1, nb));

    // Map to LUT coordinates
    const ri = nr * sizeM1;
    const gi = ng * sizeM1;
    const bi = nb * sizeM1;

    // Floor & ceil indices
    const r0 = Math.floor(ri);
    const g0 = Math.floor(gi);
    const b0 = Math.floor(bi);
    const r1 = Math.min(r0 + 1, sizeM1);
    const g1 = Math.min(g0 + 1, sizeM1);
    const b1 = Math.min(b0 + 1, sizeM1);

    // Fractional parts
    const dr = ri - r0;
    const dg = gi - g0;
    const db = bi - b0;

    // Complementary fractions
    const cdr = 1 - dr;
    const cdg = 1 - dg;
    const cdb = 1 - db;

    // LUT index helper: .cube format order is R fastest, G middle, B slowest
    // Index = (b * size * size + g * size + r) * 3
    const ss = size * size;

    // Get 8 corner indices (× 3 for RGB offset)
    const i000 = (b0 * ss + g0 * size + r0) * 3;
    const i100 = (b0 * ss + g0 * size + r1) * 3;
    const i010 = (b0 * ss + g1 * size + r0) * 3;
    const i110 = (b0 * ss + g1 * size + r1) * 3;
    const i001 = (b1 * ss + g0 * size + r0) * 3;
    const i101 = (b1 * ss + g0 * size + r1) * 3;
    const i011 = (b1 * ss + g1 * size + r0) * 3;
    const i111 = (b1 * ss + g1 * size + r1) * 3;

    // Trilinear interpolation for each channel
    for (let c = 0; c < 3; c++) {
      const c000 = data[i000 + c];
      const c100 = data[i100 + c];
      const c010 = data[i010 + c];
      const c110 = data[i110 + c];
      const c001 = data[i001 + c];
      const c101 = data[i101 + c];
      const c011 = data[i011 + c];
      const c111 = data[i111 + c];

      // Interpolate along R
      const c00 = c000 * cdr + c100 * dr;
      const c01 = c001 * cdr + c101 * dr;
      const c10 = c010 * cdr + c110 * dr;
      const c11 = c011 * cdr + c111 * dr;

      // Interpolate along G
      const c0 = c00 * cdg + c10 * dg;
      const c1 = c01 * cdg + c11 * dg;

      // Interpolate along B
      const lutVal = (c0 * cdb + c1 * db) * 255;

      // Blend with original based on intensity
      const orig = pixels[i + c];
      pixels[i + c] = Math.max(0, Math.min(255,
        orig + (lutVal - orig) * intensity + 0.5
      )) | 0;
    }
    // Alpha unchanged
  }
}


/**
 * Serialize a LUT for storage (IndexedDB).
 * We store the essential data compactly.
 */
window.serializeLUT = function(lut) {
  return {
    title: lut.title,
    size: lut.size,
    domainMin: Array.from(lut.domainMin),
    domainMax: Array.from(lut.domainMax),
    data: Array.from(lut.data)  // Float32Array → Array for JSON
  };
}

/**
 * Deserialize a stored LUT back to usable format.
 */
window.deserializeLUT = function(stored) {
  return {
    title: stored.title,
    size: stored.size,
    domainMin: stored.domainMin,
    domainMax: stored.domainMax,
    data: new Float32Array(stored.data)
  };
}
