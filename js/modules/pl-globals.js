export const A5_WIDTH = 1748;
export const A5_HEIGHT = 2480;
export const PADDING = 40;
let staffFromUrl = false;

if (typeof window !== 'undefined' && window.location) {
  const isStaffPath = window.location.pathname.toLowerCase().includes('staff.html');
  const htmlEl = document.documentElement;
  
  if (window.FORCE_STAFF_MODE || isStaffPath) {
    staffFromUrl = true;
  } else if (htmlEl && htmlEl.classList.contains('pl-mode-staff')) {
    staffFromUrl = true;
  } else if (document.body && document.body.classList.contains('pl-mode-staff')) {
    staffFromUrl = true;
  } else {
    // Fallback: detect from URL params (for backward compat with index.html redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = (urlParams.get('user') || urlParams.get('role') || urlParams.get('mode') || '').toLowerCase();
    
    if (userParam === 'staff' || userParam === 'admin' || urlParams.has('staff')) {
      staffFromUrl = true;
    } else {
      staffFromUrl = false;
    }
  }
}

export let isStaffMode = staffFromUrl;
export function setStaffMode(val) { 
  isStaffMode = val; 
}

const TEMPLATES = {
  '1photo': {
    name: '1 Photo',
    supportedSizes: ['A4', 'A5'],
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: A5_HEIGHT - PADDING * 2 }
    ]
  },
  '2photos': {
    name: '2 Photos',
    supportedSizes: ['A4', 'A5'],
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  },
  '4photos': {
    name: '4 Photos',
    supportedSizes: ['A4', 'A5'],
    slots: [
      { x: PADDING, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  }
};

export let customTemplates = {};

const parsedDefaults = {};
Object.keys(TEMPLATES).forEach(k => {
  parsedDefaults[k] = {
    name: TEMPLATES[k].name,
    slots: TEMPLATES[k].slots.map(s => ({
      cx: s.x + s.w/2,
      cy: s.y + s.h/2,
      w: s.w,
      h: s.h,
      rotation: 0
    }))
  };
});

export const ALL_TEMPLATES = { ...parsedDefaults };
