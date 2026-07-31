import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=226';
import { TemplatePicker } from '../components/TemplatePicker.js?v=226';
import { LightboxComponent } from '../components/LightboxComponent.js?v=226';
import { HeaderActions } from '../components/HeaderActions.js?v=226';
import { CrossSellBanner } from '../components/CrossSellBanner.js?v=226';
import { RoomTabsComponent } from '../components/RoomTabsComponent.js?v=226';
import { QueueModalComponent } from '../components/QueueModalComponent.js?v=226';
import { StepBannerComponent } from '../components/StepBannerComponent.js?v=226';
import { ImageListUI } from '../components/ImageListUI.js?v=226';

export const UICoreMixin = {
  _initLogin() {
    const params = new URLSearchParams(window.location.search);
    let branchId = params.get('branch') || params.get('branchId') || localStorage.getItem('branchId');
    const lockOverlay = document.getElementById('lockOverlay');

    if (branchId) {
      localStorage.setItem('branchId', branchId);
      this._initSSE(branchId);
    } else {
      window.location.replace('index.html');
      return;
    }

    document.getElementById('btnUnlock')?.addEventListener('click', () => {
      if (this.activeRoom && this.rooms[this.activeRoom]) {
        this.rooms[this.activeRoom].locked = false;
        this._updateUIForRoom();
        this._updateActiveSession(this.activeRoom, true);
        const btnNext = document.getElementById('btnNextCustomer');
        if (btnNext) btnNext.style.display = 'inline-flex';
      }
    });

    const handleNextCustomer = async () => {
      if (!confirm('Chuyển qua lượt khách hàng tiếp theo? (Phiên hiện tại sẽ được đánh dấu hoàn thành)')) return;
      const b = localStorage.getItem('branchId') || 'CN01';
      const r = this.activeRoom;
      if (b && r && this.rooms[r]) {
        const sessId = this.rooms[r].session || this.rooms[r].activeSessionId;
        if (sessId) {
          try {
            const res = await fetch(`/api/finish-session/${b}/${r}/${encodeURIComponent(sessId)}`, { method: 'POST' });
            if (res.ok) {
              const data = await res.json();
              this.rooms[r].activeSessionId = data.activeSessionId || null;
            }
          } catch (err) { console.error(err); }
        }
      }
      const lockOverlay = document.getElementById('lockOverlay');
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (r && this.rooms[r]) {
        this.rooms[r].session = this.rooms[r].activeSessionId || null;
        this.rooms[r].step = 1;
        this.currentStep = 1;
        this._staffEditingOverride = false;
        this.slots = [];
        this.selectedPhotos = new Set();
        this.canvasesState = null;

        this._stopTimer(r);
        this._updateActiveSession(r);
        this._updateUIForRoom();
        this._renderCanvas();
        this._renderTabs();
      }
    };

    document.getElementById('btnNextCustomer')?.addEventListener('click', handleNextCustomer);
    document.getElementById('btnLockNextCustomer')?.addEventListener('click', handleNextCustomer);
  }
  ,


  async _initApp() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const arr = await res.json();
        arr.forEach(t => {
          customTemplates[t.id] = {
            name: t.name || 'Custom Template',
            paper_size: t.paper_size || (t.canvas_width > 2000 ? 'A4' : 'A5'),
            slots: t.slots.map(s => ({
              cx: s.cx !== undefined ? s.cx : (s.x + s.width / 2),
              cy: s.cy !== undefined ? s.cy : (s.y + s.height / 2),
              w: s.width || s.w,
              h: s.height || s.h,
              rotation: s.rotation || 0
            })),
            frame_url: t.frame_url,
            canvas_width: t.canvas_width || 1748,
            canvas_height: t.canvas_height || 2480
          };
        });
        Object.assign(ALL_TEMPLATES, customTemplates);
      }
    } catch (e) {
      console.error("Error fetching templates from server", e);
    }

    
    this.canvas = document.getElementById('printCanvas0') || this.canvas;

    this._initMainSwiper();
    this._bindEvents();
    this._initTemplate();
    this._loadBatch();
    this._initLogin();
    if (this._initQueueManager) this._initQueueManager();
    this._initLightboxEvents();
    this._initOverlays();
  }
  ,


  _handleTimeout() {
    // Block the UI completely
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(10px)';

    overlay.innerHTML = `
      <h1 style="color:#ef4444; font-size:32px; margin-bottom:16px;">Hết thời gian!</h1>
      <p style="color:#a1a1aa; font-size:16px; margin-bottom:24px;">Bạn đã hết 3 phút để ghép ảnh.</p>
      <button class="pl-btn pl-btn-primary" onclick="window.location.reload()" style="padding:10px 24px; font-size:16px;">Tải lại trang</button>
    `;
    document.body.appendChild(overlay);
  }
  ,


  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MMEPrintBatches', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'batchId' });
        }
        if (!db.objectStoreNames.contains('batch_images')) {
          const imgStore = db.createObjectStore('batch_images', { keyPath: 'imageId' });
          imgStore.createIndex('batchId', 'batchId', { unique: false });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }
  ,


};
