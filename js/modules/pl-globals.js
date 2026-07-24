export const A5_WIDTH = 1748;
export const A5_HEIGHT = 2480;
export const PADDING = 40;
let staffFromUrl = false;

if (typeof window !== 'undefined' && window.location) {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = (urlParams.get('user') || urlParams.get('role') || urlParams.get('mode') || '').toLowerCase();
  
  if (userParam === 'staff' || userParam === 'admin' || urlParams.has('staff')) {
    staffFromUrl = true;
    try { localStorage.setItem('pl_staff_mode', 'true'); } catch(e){}
  } else if (userParam === 'user' || userParam === 'client' || userParam === 'customer') {
    staffFromUrl = false;
    try { localStorage.removeItem('pl_staff_mode'); } catch(e){}
  } else {
    try {
      staffFromUrl = (localStorage.getItem('pl_staff_mode') === 'true');
    } catch(e){}
  }
}

export let isStaffMode = staffFromUrl;
export function setStaffMode(val) { 
  isStaffMode = val; 
  try {
    if (val) localStorage.setItem('pl_staff_mode', 'true');
    else localStorage.removeItem('pl_staff_mode');
  } catch(e){}
}

const TEMPLATES = {
  '1photo': {
    name: '1 Photo',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: A5_HEIGHT - PADDING * 2 }
    ]
  },
  '2photos': {
    name: '2 Photos',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  },
  '4photos': {
    name: '4 Photos',
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
