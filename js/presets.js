// ============================================
// PhotoTune Pro — Preset Definitions
// ============================================

export const PRESETS = {
  autoEnhance: {
    name: 'Auto Enhance',
    desc: 'Chỉnh nhanh an toàn',
    icon: '⚡',
    values: {
      exposure: 12, contrast: 10, highlights: -15, shadows: 18,
      vibrance: 15, sharpness: 15
    }
  },
  cleanProduct: {
    name: 'Clean Product',
    desc: 'Ảnh sản phẩm nền sáng',
    icon: '📦',
    values: {
      exposure: 20, contrast: 10, highlights: -15, shadows: 20,
      whites: 20, blacks: -8, vibrance: 12, sharpness: 20
    }
  },
  luxuryProduct: {
    name: 'Luxury Product',
    desc: 'Mỹ phẩm, trang sức',
    icon: '💎',
    values: {
      exposure: 5, contrast: 25, highlights: -20, shadows: -5,
      whites: 10, blacks: -20, temperature: 4, clarity: 15
    }
  },
  foodBright: {
    name: 'Food Bright',
    desc: 'Đồ ăn, quán cafe',
    icon: '🍽️',
    values: {
      exposure: 18, contrast: 12, shadows: 15, temperature: 8,
      vibrance: 25, saturation: 8, texture: 10
    }
  },
  realEstate: {
    name: 'Real Estate',
    desc: 'Nhà, nội thất',
    icon: '🏠',
    values: {
      exposure: 25, highlights: -30, shadows: 35, whites: 15,
      temperature: 3, clarity: 10, dehaze: 5
    }
  },
  fashionSoft: {
    name: 'Fashion Soft',
    desc: 'Quần áo, mẫu người',
    icon: '👗',
    values: {
      exposure: 15, contrast: -5, highlights: -20, shadows: 15,
      temperature: 5, vibrance: 10, clarity: -5
    }
  },
  industrialSharp: {
    name: 'Industrial',
    desc: 'Nhà máy, máy móc, B2B',
    icon: '🏭',
    values: {
      contrast: 20, highlights: -10, shadows: 10, blacks: -15,
      clarity: 25, texture: 20, dehaze: 10, sharpness: 25
    }
  },
  warmLifestyle: {
    name: 'Warm Lifestyle',
    desc: 'Ảnh đời sống, social',
    icon: '🌅',
    values: {
      exposure: 10, temperature: 12, tint: 3, vibrance: 20,
      shadows: 10, contrast: 5
    }
  },
  coolTech: {
    name: 'Cool Tech',
    desc: 'SaaS, công nghệ',
    icon: '💻',
    values: {
      temperature: -10, tint: 2, contrast: 18, whites: 10,
      blacks: -12, clarity: 15, saturation: -5
    }
  },
  whiteBgFix: {
    name: 'White BG Fix',
    desc: 'Làm nền trắng sạch',
    icon: '⬜',
    values: {
      exposure: 25, highlights: 10, shadows: 10, whites: 35,
      blacks: -5, saturation: -3
    }
  }
};

// Default parameter values (all zero)
export const DEFAULT_PARAMS = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  hue: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  sharpness: 0,
  noiseReduction: 0
};
