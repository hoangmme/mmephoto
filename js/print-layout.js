// ============================================
// MME Color Lab — Print Layout Module
// ============================================
// Independent module for A5 print layout
// Reads processed images from IndexedDB batch

const A5_WIDTH = 1748;
const A5_HEIGHT = 2480;
const PADDING = 40;
const isStaffMode = window.location.pathname.includes('staff.html');

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

let customTemplates = {};

// Convert default TEMPLATES x,y to cx,cy
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

const ALL_TEMPLATES = { ...parsedDefaults };


import { StateMixin } from './modules/pl-state.js';
import { UIMixin } from './modules/pl-ui.js';
import { CanvasMixin } from './modules/pl-canvas.js';
import { QueueMixin } from './modules/pl-queue.js';

class PrintLayoutApp {
  constructor() {
    this.batchId = null;
    this.images = [];          // Array of { id, name, blob, objectUrl, width, height, createdAt }
    this.selectedImageId = null;
    this.selectedSlotIndex = -1;
    this.currentTemplate = '2photos';
    this.selectedPhotos = new Set();

    // Default preview images for Step 1
    this.defaultPreviewImages = [];
    const defaultImg = new Image();
    defaultImg.crossOrigin = 'anonymous'; // Important for external URLs on canvas
    defaultImg.onload = () => {
      if (this.canvas) this._renderCanvas();
      if (this.mainSwiper) this._initMainSwiper();
    };
    defaultImg.src = 'https://images.unsplash.com/photo-1604004555489-723a93d6ce74?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
    this.defaultPreviewImages.push(defaultImg);

    // Slot state
    this.slots = [];           // Array of { imageId, zoom, panX, panY, assignedAt }

    // Loaded image elements (cached for canvas drawing)
    this._imageCache = {};     // id -> HTMLImageElement

    // Canvas
    this.canvas = document.getElementById('printCanvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'printCanvas';
    }
    this.ctx = this.canvas.getContext('2d');

    // DOM
    this.imageList = document.getElementById('imageList');
    this.imageCount = document.getElementById('imageCount');
    this.mainSwiper = document.getElementById('mainSwiper');
    this.slotProps = document.getElementById('slotProps');
    this.exportOverlay = document.getElementById('exportOverlay');

    this.frameImageObj = null;

    // Parse batch ID from URL
    const params = new URLSearchParams(window.location.search);
    this.batchId = params.get('batch');
    this.rooms = {};
    this.activeRoom = null;
    this._initApp();
  }
}

Object.assign(PrintLayoutApp.prototype, StateMixin, UIMixin, CanvasMixin, QueueMixin);

window.addEventListener('DOMContentLoaded', () => {
  const b = localStorage.getItem('branchId');
  if (b) {
    window.printApp = new PrintLayoutApp(b);
  } else {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }
});
