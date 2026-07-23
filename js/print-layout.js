// ============================================
// MME Color Lab — Print Layout Module
// ============================================
// Independent module for A5 print layout
// Reads processed images from IndexedDB batch

import { ALL_TEMPLATES, customTemplates, isStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './modules/pl-globals.js';



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
