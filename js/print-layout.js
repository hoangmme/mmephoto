// ============================================
// MME Color Lab — Print Layout Module
// ============================================
// Independent module for A5 print layout
// Reads processed images from IndexedDB batch

const A5_WIDTH = 1748;
const A5_HEIGHT = 2480;
const PADDING = 40;

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
    // Not needed in Main Swiper logic: this.canvas = document.getElementById('printCanvas');
    // this.ctx = this.canvas.getContext('2d');

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



  _initSSE(branch) {
    const branchNameEl = document.getElementById('headerBranchName');
    if (branchNameEl) {
      branchNameEl.textContent = `Chi nhánh: ${branch}`;
      branchNameEl.style.display = 'inline';
    }

    if (this.sse) this.sse.close();
    this.sse = new EventSource(`/api/stream/${branch}`);
    
    this.sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'init') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
        this.rooms[room].queue = data.sessions || [];
        this._updateActiveSession(room);
        this._renderTabs();
        this._updateUIForRoom();
      } else if (data.type === 'new_image') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
        
        // Find if session is in queue
        let sessionObj = this.rooms[room].queue.find(s => s.id === data.session);
        if (!sessionObj) {
            sessionObj = { id: data.session, images: [] };
            this.rooms[room].queue.push(sessionObj);
        }
        sessionObj.images.push(data.imageUrl);

        // If this is the active session
        if (this.rooms[room].session === data.session) {
            this.rooms[room].lastImageTime = Date.now();
            if (this.rooms[room].images.length === 0) {
              this._setStep(room, 1);
            }
            const newImg = { id: 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000), url: data.imageUrl, name: data.imageUrl.split('/').pop() };
            this.rooms[room].images.push(newImg);
            this._preloadImage(newImg.id, newImg.url).then(() => {
                if (this.activeRoom === room) this._renderCanvas();
            });
            if (this.activeRoom !== room) {
                this.rooms[room].hasNew = true;
                this._renderTabs();
            } else {
                this._updateUIForRoom();
            }
        } else {
            // It's a queued session, just update the badge
            if (this.activeRoom === room) Object.assign(this.rooms[room], {hasNew: false}); // ensure no weirdness
            if (this.activeRoom === room) this._updateActiveSession(room, true); // update badge only
        }
      } else if (data.type === 'session_finished') {
        const room = data.room;
        if (this.rooms[room]) {
           this.rooms[room].queue = this.rooms[room].queue.filter(s => s.id !== data.session);
           // If the finished session is the active one, advance queue
           if (this.rooms[room].session === data.session) {
               this._stopTimer(room);
               this.rooms[room].session = null; // force update
               this.rooms[room].step = 1;
               this.rooms[room].timerStarted = false;
               this.rooms[room].lastImageTime = null;
               this._updateActiveSession(room);
               if (this.activeRoom === room) {
                   this._updateUIForRoom();
                   this._renderCanvas();
               }
           }
           this._renderTabs();
        }
      }
    };
  }
  
  _updateActiveSession(room, onlyBadge = false) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    
    if (!roomData.queue) roomData.queue = [];
    
    if (roomData.queue && roomData.queue.length > 0) {
      const active = roomData.queue[0];
      if (roomData.session !== active.id && !onlyBadge) {
        roomData.session = active.id;
        roomData.step = 1;
        roomData.timerStarted = false;
        roomData.lastImageTime = Date.now();
        this.selectedPhotos.clear();
        roomData.images = active.images.map(url => {
          const id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          this._preloadImage(id, url).then(() => this._renderCanvas());
          return { id, url, name: url.split('/').pop() };
        });
        if (roomData.images.length > 0) {
          this._setStep(room, 1);
        }
      }
    } else if (!onlyBadge) {
      roomData.session = null;
      roomData.images = [];
      roomData.step = 1;
      roomData.timerStarted = false;
      this.selectedPhotos.clear();
      this._stopTimer(room);
    }
    
    // Update Header
    if (this.activeRoom === room) {
       const lbl = document.getElementById('headerSessionName');
       if (lbl) {
         if (roomData.session) {
           lbl.innerText = "Phiên chụp: " + roomData.session;
           lbl.style.display = 'inline';
           const qLen = roomData.queue.length - 1;
           if (qLen > 0) lbl.innerText += ` (+${qLen} chờ)`;
         } else {
           lbl.style.display = 'none';
         }
       }
    }
  }

  _renderTabs() {
    const tabsContainer = document.getElementById('roomTabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';
    
    const rooms = Object.keys(this.rooms);
    if (rooms.length === 0) return;
    
    if (!this.activeRoom && rooms.length > 0) {
      this.activeRoom = rooms[0];
      this._updateUIForRoom();
    }
    
    rooms.forEach(room => {
      const btn = document.createElement('button');
      btn.innerText = room;
      btn.style.padding = '8px 12px';
      btn.style.border = '1px solid var(--pl-border)';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.position = 'relative';
      btn.style.fontWeight = '600';
      
      if (room === this.activeRoom) {
        btn.style.background = 'var(--pl-accent)';
        btn.style.color = '#000';
      } else {
        btn.style.background = 'var(--pl-bg-section)';
        btn.style.color = 'var(--pl-text)';
      }
      
      if (this.rooms[room].hasNew && room !== this.activeRoom) {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.top = '-2px';
        dot.style.right = '-2px';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.background = '#ef4444';
        dot.style.borderRadius = '50%';
        btn.appendChild(dot);
      }
      
      btn.onclick = () => {
        this.activeRoom = room;
        this.rooms[room].hasNew = false;
        this._renderTabs();
        this._updateUIForRoom();
      };
      
      tabsContainer.appendChild(btn);
    });
  }
  
  _updateUIForRoom() {
    this._updateActiveSession(this.activeRoom, true);
    const mainContainer = document.getElementById('mainContainer') || document.querySelector('.pl-main');
    const timerEl = document.getElementById('countdownTimer');
    const qrOverlay = document.getElementById('qrOverlay');
    const lockOverlay = document.getElementById('lockOverlay');
    const btnNext = document.getElementById('btnNextCustomer');
    const stepBanner = document.getElementById('stepBanner');
    const instructionText = document.getElementById('stepInstructionText');
    const uploadBadge = document.getElementById('uploadStatusBadge');
    const uploadText = document.getElementById('uploadStatusText');
    const btnStepPrev = document.getElementById('btnStepPrev');
    const btnStepNext = document.getElementById('btnStepNext');
    const stepFooterInfo = document.getElementById('stepFooterInfo');
    const stepFooter = document.getElementById('stepFooter');

    if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) {
      this.images = [];
      this._renderImageList();
      if (timerEl) timerEl.style.display = 'none';
      if (qrOverlay) qrOverlay.style.display = 'none';
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (btnNext) btnNext.style.display = 'none';
      if (mainContainer) mainContainer.className = 'pl-main pl-step-mode-1';
      if (instructionText) instructionText.textContent = 'Chưa có phiên chụp nào. Vui lòng chụp ảnh hoặc chạm để chọn sẵn Khung in (Frame) yêu thích trong khi chờ.';
      if (uploadBadge) uploadBadge.style.display = 'none';
      if (stepFooter) stepFooter.style.display = 'none';
      return;
    }
    
    if (stepFooter) stepFooter.style.display = 'flex';
    
    const roomData = this.rooms[this.activeRoom];
    const step = roomData.step || 1;
    this.images = roomData.images;
    this._renderImageList();

    // Update main mode class
    if (mainContainer) mainContainer.className = `pl-main pl-step-mode-${step}`;

    // Update step banner active/completed items
    if (stepBanner) {
      stepBanner.querySelectorAll('.pl-step-item').forEach(item => {
        const sNum = parseInt(item.dataset.step);
        item.classList.toggle('active', sNum === step);
        item.classList.toggle('completed', sNum < step);
      });
    }

    // Check if waiting for quiet period (full images uploaded)
    const isWaitingForPhotos = !roomData.timerStarted && (step === 1 || step === 2) && roomData.lastImageTime && (Date.now() - roomData.lastImageTime < 30000);
    if (uploadBadge && uploadText) {
      if (isWaitingForPhotos) {
        uploadBadge.style.display = 'inline-flex';
        uploadText.textContent = `📥 Đang nhận ảnh từ máy ảnh (${roomData.images.length} ảnh)...`;
      } else {
        uploadBadge.style.display = 'none';
      }
    }

    // Instruction text & buttons based on step
    if (instructionText && btnStepPrev && btnStepNext && stepFooterInfo) {
      if (stepFooterInfo) stepFooterInfo.textContent = ''; // Gom hướng dẫn về 1 chỗ (banner trên)
      
      if (step === 1) {
        instructionText.textContent = isWaitingForPhotos
          ? '👉 Bước 1: Chọn mẫu Khung In trong khi đợi tải full ảnh từ máy ảnh...'
          : '👉 Bước 1: Vuốt sang trái/phải và chạm chọn Mẫu Khung In (Frame) yêu thích của bạn';
        btnStepPrev.style.display = 'none';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = 'Tiếp theo: Chọn Ảnh (B2) <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        if (btnNext) btnNext.style.display = 'none';
        if (qrOverlay) qrOverlay.style.display = 'none';
      } else if (step === 2) {
        const filledSlots = this.slots ? this.slots.filter(s => s.imageId).length : 0;
        const totalSlots = this.slots ? this.slots.length : 0;
        instructionText.textContent = `👉 Bước 2: Chạm vào các bức ảnh bên trái để điền vào khung in (${filledSlots}/${totalSlots} ô)`;
        btnStepPrev.style.display = 'inline-flex';
        btnStepPrev.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Quay lại B1';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = 'Tiếp theo: Sắp Xếp (B3) <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        if (btnNext) btnNext.style.display = 'none';
        if (qrOverlay) qrOverlay.style.display = 'none';
      } else if (step === 3) {
        instructionText.textContent = '👉 Bước 3: Dùng 2 ngón tay chạm lên canvas để kéo ra/vào phóng to hoặc xoay căn chỉnh ảnh';
        btnStepPrev.style.display = 'inline-flex';
        btnStepPrev.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Quay lại B2';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = '✅ Hoàn Tất (Gửi cho Nhân Viên)';
        if (btnNext) btnNext.style.display = 'none';
        if (qrOverlay) qrOverlay.style.display = 'none';
      } else if (step === 4) {
        instructionText.textContent = '✨ Khách hàng đã hoàn tất! Nhân viên hỗ trợ kiểm tra, tải, in ảnh hoặc bấm Next Customer';
        btnStepPrev.style.display = 'inline-flex';
        btnStepPrev.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Quay lại B1 (Sửa)';
        btnStepNext.style.display = 'none';
        if (btnNext) btnNext.style.display = 'inline-flex';
        if (qrOverlay) qrOverlay.style.display = 'block';
      }
    }
    
    // Timer update
    if (timerEl) {
      if (step === 4 || !roomData.timerStarted) {
        if (step === 4) {
          timerEl.style.display = 'none';
        } else {
          timerEl.style.display = 'block';
          timerEl.innerText = step === 1 ? '01:00' : (step === 2 ? '03:00' : '01:00');
          timerEl.style.color = 'var(--pl-accent)';
        }
        if (lockOverlay) lockOverlay.style.display = 'none';
      } else {
        timerEl.style.display = 'block';
        const m = Math.floor(roomData.timeLeft / 60).toString().padStart(2, '0');
        const s = (roomData.timeLeft % 60).toString().padStart(2, '0');
        timerEl.innerText = `${m}:${s}`;
        if (roomData.timeLeft <= 15) {
          timerEl.style.color = '#ef4444';
        } else {
          timerEl.style.color = 'var(--pl-accent)';
        }
        if (roomData.locked) {
          if (lockOverlay) lockOverlay.style.display = 'flex';
        } else {
          if (lockOverlay) lockOverlay.style.display = 'none';
        }
      }
    }
    
    // QR Code (chỉ render & hiện ở step 4)
    if (roomData.session && step === 4) {
      this._updateQRCode(this.activeRoom, roomData.session);
    }

    // Re-adjust swiper padding after mode/layout change
    requestAnimationFrame(() => {
      if (this._updatePadding) this._updatePadding();
    });
  }

  _setStep(room, step) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    if (roomData.step === step && roomData.timerInterval) return;
    roomData.step = step;
    this._startStepTimer(room, step);
    if (this.activeRoom === room) {
      this._updateUIForRoom();
      this._renderCanvas();
    }
  }

  _startStepTimer(room, step) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    if (roomData.timerInterval) clearInterval(roomData.timerInterval);
    
    roomData.step = step;
    roomData.locked = false;
    
    if (step === 1) roomData.timeLeft = 60;
    else if (step === 2) roomData.timeLeft = 180;
    else if (step === 3) roomData.timeLeft = 60;
    else {
      roomData.timeLeft = 0;
      if (this.activeRoom === room) this._updateUIForRoom();
      return;
    }

    roomData.timerInterval = setInterval(() => {
      // Smart timer check: wait until 30s of no new images arriving
      if (!roomData.timerStarted && (step === 1 || step === 2)) {
        if (!roomData.lastImageTime || (Date.now() - roomData.lastImageTime >= 30000)) {
          roomData.timerStarted = true;
        } else {
          if (this.activeRoom === room) this._updateUIForRoom();
          return; // hold countdown while photos are uploading
        }
      }

      roomData.timeLeft--;
      if (roomData.timeLeft <= 0) {
        clearInterval(roomData.timerInterval);
        if (step === 1) {
          this._setStep(room, 2);
        } else if (step === 2) {
          if (this._autoFill) this._autoFill();
          this._setStep(room, 3);
        } else if (step === 3) {
          this._setStep(room, 4);
        }
      }

      if (this.activeRoom === room) {
        this._updateUIForRoom();
      }
    }, 1000);
  }

  _startTimer(room) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    this._startStepTimer(room, roomData.step || 1);
  }

  _stopTimer(room) {
    if (this.rooms[room] && this.rooms[room].timerInterval) {
      clearInterval(this.rooms[room].timerInterval);
      this.rooms[room].timerInterval = null;
    }
  }

  _updateQRCode(room, session) {
    const qrOverlay = document.getElementById('qrOverlay');
    if (!qrOverlay) return;
    qrOverlay.style.display = 'block';
    const img = document.getElementById('qrImage');
    const b = localStorage.getItem('branchId') || '';
    const url = `${window.location.origin}/download.html?branch=${b}&room=${room}&session=${session}`;
    
    const qrLink = document.getElementById('qrLink');
    if (qrLink) qrLink.href = url;

    if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=${encodeURIComponent(url)}`;
    }
  }


  _initLogin() {
    const branchId = localStorage.getItem('branchId');
    const loginOverlay = document.getElementById('loginOverlay');
    const lockOverlay = document.getElementById('lockOverlay');
    
    if (!branchId) {
      if(loginOverlay) loginOverlay.style.display = 'flex';
    } else {
      if(loginOverlay) loginOverlay.style.display = 'none';
      this._initSSE(branchId);
    }
    
    document.getElementById('btnLoginSubmit')?.addEventListener('click', async () => {
      const branch = document.getElementById('loginBranch').value.trim();
      const pass = document.getElementById('loginPassword').value.trim();
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branchId: branch, password: pass})
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.isAdmin) {
          localStorage.setItem('adminAuth', data.auth);
          window.location.href = '/admin.html?auth=' + encodeURIComponent(data.auth);
          return;
        }
        localStorage.setItem('branchId', branch);
        if(loginOverlay) loginOverlay.style.display = 'none';
        this._initSSE(branch);
      } else {
        const err = document.getElementById('loginError');
        if (err) err.style.display = 'block';
      }
    });
    
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
      const b = localStorage.getItem('branchId');
      const r = this.activeRoom;
      if (b && r && this.rooms[r] && this.rooms[r].session) {
        await fetch(`/api/finish-session/${b}/${r}/${this.rooms[r].session}`, { method: 'POST' });
      }
      const btnNext = document.getElementById('btnNextCustomer');
      if (btnNext) btnNext.style.display = 'none';
      const lockOverlay = document.getElementById('lockOverlay');
      if (lockOverlay) lockOverlay.style.display = 'none';
    };
    
    document.getElementById('btnNextCustomer')?.addEventListener('click', handleNextCustomer);
    document.getElementById('btnLockNextCustomer')?.addEventListener('click', handleNextCustomer);
  }
  async _initApp() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const arr = await res.json();
        arr.forEach(t => {
          customTemplates[t.id] = {
            name: t.name || 'Custom Template',
            slots: t.slots.map(s => ({
              cx: s.cx !== undefined ? s.cx : (s.x + s.width/2),
              cy: s.cy !== undefined ? s.cy : (s.y + s.height/2),
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
    } catch(e) {
      console.error("Error fetching templates from server", e);
    }

    this.mainSwiper = document.getElementById('mainSwiper');
    this.canvas = document.getElementById('printCanvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'printCanvas';
    }
    this.ctx = this.canvas.getContext('2d');

    this._initMainSwiper();
    this._bindEvents();
    this._initTemplate();
    this._loadBatch();
    this._initLogin();
  }

  _initMainSwiper() {
    if (!this.mainSwiper) return;
    this.mainSwiper.innerHTML = '';
    
    Object.keys(ALL_TEMPLATES).forEach(k => {
      const t = ALL_TEMPLATES[k];
      const slide = document.createElement('div');
      slide.className = 'pl-slide';
      slide.dataset.id = k;
      
      const preview = document.createElement('div');
      preview.className = 'pl-slide-preview';
      
      const cvs = document.createElement('canvas');
      cvs.width = t.canvas_width || A5_WIDTH;
      cvs.height = t.canvas_height || A5_HEIGHT;
      // Draw template with default photos
      this._drawToCanvas(cvs, false, t, true);
      preview.appendChild(cvs);
      
      slide.appendChild(preview);
      
      slide.addEventListener('click', () => {
        if (this.currentTemplate !== k) {
           this._selectSlide(k);
        } else {
           const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
           const hasSession = this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].session;
           if (step === 1 && hasSession) {
             this._setStep(this.activeRoom, 2);
           }
        }
      });
      
      this.mainSwiper.appendChild(slide);
    });

    // Padding to center first/last
    this._updatePadding = () => {
       const parentArea = this.mainSwiper.parentElement;
       if (this.mainSwiper.children.length > 0 && parentArea.offsetWidth > 0) {
         const firstSlide = this.mainSwiper.children[0];
         const slideWidth = firstSlide.offsetWidth;
         if (slideWidth > 0) {
           const pad = Math.max(0, (parentArea.offsetWidth - slideWidth) / 2);
           this.mainSwiper.style.paddingLeft = `${pad}px`;
           this.mainSwiper.style.paddingRight = `${pad}px`;
           this.mainSwiper.classList.add('loaded');
           
           // Ensure active slide is centered after padding change
           if (this.currentTemplate) {
              requestAnimationFrame(() => {
                const activeSlide = this.mainSwiper.querySelector(`[data-id="${this.currentTemplate}"]`);
                if (activeSlide) {
                  this.mainSwiper.scrollLeft = activeSlide.offsetLeft - pad;
                }
              });
           }
         }
       }
    };

    const ro = new ResizeObserver(() => this._updatePadding());
    ro.observe(this.mainSwiper.parentElement);
    
    // Also run when images inside load
    this.mainSwiper.querySelectorAll('img').forEach(img => {
       img.addEventListener('load', () => this._updatePadding());
    });

    // Auto select on scroll
    let scrollTimeout;
    this.mainSwiper.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      
      // Update visual scaling
      const center = this.mainSwiper.scrollLeft + this.mainSwiper.offsetWidth / 2;
      Array.from(this.mainSwiper.children).forEach(slide => {
         const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
         const diff = Math.abs(center - slideCenter);
         
         // Progress from 0 (at center) to 1 (at edges)
         const progress = Math.min(1, diff / (slide.offsetWidth * 1.2));
         
         // Scale goes from 1.0 (center) down to 0.85 (edges)
         const scale = 1.0 - (progress * 0.15); 
         
         // Opacity goes from 1.0 (center) down to 0.5 (edges)
         const opacity = 1.0 - (progress * 0.5);
         
         slide.style.transform = `scale(${scale})`;
         slide.style.opacity = opacity;
      });

      if (this.isProgrammaticScroll) return;

      scrollTimeout = setTimeout(() => {
        let closest = null;
        let minDiff = Infinity;
        Array.from(this.mainSwiper.children).forEach(slide => {
           const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
           const diff = Math.abs(center - slideCenter);
           if (diff < minDiff) {
              minDiff = diff;
              closest = slide;
           }
        });
        
        // Only trigger template switch when it fully snapped
        if (closest && closest.dataset.id !== this.currentTemplate && minDiff < 50) {
           this._selectSlide(closest.dataset.id);
        }
      }, 150);
    });
    
    // Set initial
    if (!ALL_TEMPLATES[this.currentTemplate]) {
      this.currentTemplate = Object.keys(ALL_TEMPLATES)[0];
    }
    
    // Force select first without scrolling animation
    this._selectSlide(this.currentTemplate, true);
  }

  _selectSlide(id, instant = false) {
     this.currentTemplate = id;
     const targetSlide = Array.from(this.mainSwiper.children).find(s => s.dataset.id === id);
     if (!targetSlide) return;
     
     Array.from(this.mainSwiper.children).forEach(s => {
        s.classList.remove('active');
        if (s.contains(this.canvas)) {
           s.removeChild(this.canvas);
        }
     });
     
     targetSlide.classList.add('active');
     targetSlide.appendChild(this.canvas);
     
     this._initTemplate();
     this._renderCanvas();
     this._renderImageList();
     this._renderSlotProps();
     
     const pad = (this.mainSwiper.offsetWidth - targetSlide.offsetWidth) / 2;
     
     this.isProgrammaticScroll = true;
     this.mainSwiper.scrollTo({ 
       left: targetSlide.offsetLeft - pad, 
       behavior: instant ? 'auto' : 'smooth' 
     });

     clearTimeout(this.scrollUnlockTimeout);
     this.scrollUnlockTimeout = setTimeout(() => {
        this.isProgrammaticScroll = false;
     }, instant ? 100 : 500);
  }

  // ── Event Bindings ──
  _bindEvents() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi chi nhánh này?')) {
          localStorage.removeItem('branchId');
          window.location.reload();
        }
      });
    }

    document.getElementById('btnSelectAll').addEventListener('click', () => this._selectAll());
    document.getElementById('btnDeselectAll').addEventListener('click', () => this._deselectAll());
    document.getElementById('btnAutoFill').addEventListener('click', () => this._autoFill());
    
    const btnUploadTest = document.getElementById('btnUploadTest');
    const fileUploadTest = document.getElementById('fileUploadTest');
    if (btnUploadTest && fileUploadTest) {
      btnUploadTest.addEventListener('click', () => fileUploadTest.click());
      fileUploadTest.addEventListener('change', (e) => this._uploadTestImages(e));
    }

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => this._print());
    
    const btnExportJPG = document.getElementById('btnExportJPG');
    if (btnExportJPG) btnExportJPG.addEventListener('click', () => this._exportJPG());
    
    const btnLockExportJPG = document.getElementById('btnLockExportJPG');
    if (btnLockExportJPG) btnLockExportJPG.addEventListener('click', () => this._exportJPG());
    
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) btnExportPDF.addEventListener('click', () => this._exportPDF());

    // Step Wizard Navigation Buttons
    const btnStepPrev = document.getElementById('btnStepPrev');
    if (btnStepPrev) {
      btnStepPrev.addEventListener('click', () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
        const cur = this.rooms[this.activeRoom].step || 1;
        if (cur === 4) {
          this._setStep(this.activeRoom, 1);
        } else if (cur > 1) {
          this._setStep(this.activeRoom, cur - 1);
        }
      });
    }

    const btnStepNext = document.getElementById('btnStepNext');
    if (btnStepNext) {
      btnStepNext.addEventListener('click', () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
        const cur = this.rooms[this.activeRoom].step || 1;
        if (cur === 1) {
          this._setStep(this.activeRoom, 2);
        } else if (cur === 2) {
          if (this.selectedPhotos.size > 0) {
            // Clear existing slots first
            this.slots.forEach(s => s.imageId = null);
            let imgIndex = 0;
            const selectedArr = Array.from(this.selectedPhotos);
            for (let i = 0; i < this.slots.length; i++) {
              if (imgIndex < selectedArr.length) {
                this._assignToSlot(i, selectedArr[imgIndex]);
                imgIndex++;
              }
            }
          } else {
            if (this._autoFill) this._autoFill();
          }
          this._setStep(this.activeRoom, 3);
        } else if (cur === 3) {
          this._setStep(this.activeRoom, 4);
        }
      });
    }

    const btnNextCustomer = document.getElementById('btnNextCustomer');
    if (btnNextCustomer) {
      btnNextCustomer.addEventListener('click', () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) return;
        if (confirm('Chuyển qua lượt khách hàng tiếp theo? (Phiên hiện tại sẽ được đánh dấu hoàn thành)')) {
          const branch = localStorage.getItem('branchId') || 'CN01';
          const sess = this.rooms[this.activeRoom].session;
          fetch(`/api/finish-session/${branch}/${this.activeRoom}/${sess}`, { method: 'POST' }).catch(() => {});
          
          if (this.rooms[this.activeRoom].queue && this.rooms[this.activeRoom].queue.length > 0) {
            this.rooms[this.activeRoom].queue.shift();
          }
          this._stopTimer(this.activeRoom);
          this.rooms[this.activeRoom].session = null;
          this.rooms[this.activeRoom].step = 1;
          this.rooms[this.activeRoom].timerStarted = false;
          this._updateActiveSession(this.activeRoom);
          this._updateUIForRoom();
          this._renderCanvas();
          this._renderTabs();
        }
      });
    }

    const stepBanner = document.getElementById('stepBanner');
    if (stepBanner) {
      stepBanner.querySelectorAll('.pl-step-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) return;
          const targetStep = parseInt(item.dataset.step);
          if (targetStep && targetStep >= 1 && targetStep <= 4) {
            this._setStep(this.activeRoom, targetStep);
          }
        });
      });
    }

    // Import Custom Template
    const btnImport = document.getElementById('btnImportTemplateJson');
    const inputImport = document.getElementById('templateJsonInput');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', (e) => this._importTemplateJson(e));
    }

    // Canvas click → select slot
    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));

    // Canvas drag for pan
    let isDragging = false, dragStartX, dragStartY, dragSlot;
    this.canvas.addEventListener('mousedown', (e) => {
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      isDragging = true;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      dragSlot = this.selectedSlotIndex;
      this.canvas.style.cursor = 'grabbing';
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const scale = this.canvas.width / this.canvas.offsetWidth;
      const dx = (e.offsetX - dragStartX) * scale;
      const dy = (e.offsetY - dragStartY) * scale;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      this._panSlot(dragSlot, dx, dy);
    });
    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
      this.canvas.style.cursor = '';
    });
    this.canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      this.canvas.style.cursor = '';
    });
    


    // Touch support for pan, zoom (pinch), and rotation (2-finger twist)
    let touchStartX, touchStartY;
    let initialPinchDistance = 0, initialPinchAngle = 0;
    let initialSlotZoom = 1.0, initialSlotRot = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;

      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const t0 = e.touches[0], t1 = e.touches[1];
        initialPinchDistance = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        initialPinchAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI);
        initialSlotZoom = slot.zoom || 1.0;
        initialSlotRot = slot.rotation || 0;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const scale = this.canvas.width / this.canvas.offsetWidth;
        const dx = (touch.clientX - touchStartX) * scale;
        const dy = (touch.clientY - touchStartY) * scale;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        this._panSlot(this.selectedSlotIndex, dx, dy);
        e.preventDefault();
      } else if (e.touches.length === 2 && initialPinchDistance > 0) {
        const t0 = e.touches[0], t1 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const scaleFactor = currentDist / initialPinchDistance;
        const newZoom = Math.max(0.3, Math.min(4.0, initialSlotZoom * scaleFactor));

        const currentAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI);
        let deltaAngle = currentAngle - initialPinchAngle;
        let newRot = (initialSlotRot + deltaAngle) % 360;
        if (newRot < 0) newRot += 360;

        slot.zoom = newZoom;
        slot.rotation = newRot;
        this._clampPan(this.selectedSlotIndex);
        this._renderCanvas();
        e.preventDefault();
      }
    }, { passive: false });

    // Mouse wheel zoom support for desktop testing/usage
    this.canvas.addEventListener('wheel', (e) => {
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this._zoomSlot(this.selectedSlotIndex, Math.max(0.3, Math.min(4.0, (slot.zoom || 1.0) + delta)));
      e.preventDefault();
    }, { passive: false });
  }

  // ── Load Batch from IndexedDB ──
  async _loadBatch() {
    if (!this.batchId) {
      this.imageList.innerHTML = '<div class="pl-loading">Không tìm thấy batch ID trong URL.</div>';
      return;
    }

    try {
      const db = await this._openDB();
      const tx = db.transaction('batch_images', 'readonly');
      const store = tx.objectStore('batch_images');
      const index = store.index('batchId');
      const request = index.getAll(this.batchId);

      request.onsuccess = async (e) => {
        const records = e.target.result || [];
        if (records.length === 0) {
          this.imageList.innerHTML = '<div class="pl-loading">Batch trống hoặc không tồn tại.</div>';
          return;
        }

        // Convert blobs to object URLs and preload images
        for (const rec of records) {
          const objectUrl = URL.createObjectURL(rec.blob);
          const img = {
            id: rec.imageId,
            name: rec.name,
            blob: rec.blob,
            objectUrl,
            width: rec.width,
            height: rec.height,
            createdAt: rec.createdAt
          };
          this.images.push(img);

          // Preload into image cache
          await this._preloadImage(img.id, objectUrl);
        }

        this.imageCount.textContent = `${this.images.length} ảnh`;
        this._renderImageList();
        this._renderCanvas();
        this._startTimer();
      };

      request.onerror = () => {
        this.imageList.innerHTML = '<div class="pl-loading">Lỗi đọc dữ liệu batch.</div>';
      };
    } catch (err) {
      console.error('Failed to load batch:', err);
      this.imageList.innerHTML = '<div class="pl-loading">Lỗi kết nối IndexedDB.</div>';
    }
  }

  // ── Countdown Timer ──
  _startTimer() {
    this.timerEl = document.getElementById('countdownTimer');
    if (!this.timerEl) return;
    this.timerEl.style.display = 'block';

    let timeLeft = 180; // 3 minutes
    
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.countdownInterval);
        this.timerEl.textContent = "00:00";
        this.timerEl.style.color = 'red';
        this._handleTimeout();
        return;
      }
      
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      this.timerEl.textContent = `${m}:${s}`;
      
      if (timeLeft <= 30) {
        this.timerEl.style.color = '#ef4444'; // Red warning
        this.timerEl.style.animation = 'plPulse 1s infinite alternate';
      }
    }, 1000);
  }

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

  _preloadImage(id, url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._imageCache[id] = img;
        resolve();
      };
      img.onerror = () => resolve(); // Skip broken images
      img.src = url;
    });
  }

  // ── Template ──
  _initTemplate() {
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    
    // Check if we need to load frame image
    this.frameImageObj = null;
    if (tmpl.frame_url) {
      this.frameImageObj = new Image();
      this.frameImageObj.onload = () => this._renderCanvas();
      this.frameImageObj.src = tmpl.frame_url;
    }

    this.slots = tmpl.slots.map(() => ({
      imageId: null,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      assignedAt: null
    }));
    
    // Default select first slot for easier tapping
    this.selectedSlotIndex = 0;

    // Auto-fill slots automatically for better UX
    setTimeout(() => {
       this._autoFill();
       this._renderCanvas();
    }, 50);
  }

  // ── Render Image List ──
  _renderImageList() {
    this.imageList.innerHTML = '';
    const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    this.images.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      
      if (step === 2) {
        if (this.selectedPhotos.has(img.id)) thumb.classList.add('selected');
      } else {
        if (img.id === this.selectedImageId) thumb.classList.add('selected');
        if (usedIds.has(img.id)) thumb.classList.add('used');
      }

      const srcUrl = img.objectUrl || img.url;
      const imgName = img.name || img.id;

      thumb.innerHTML = `
        <img src="${srcUrl}" alt="${imgName}">
        <div class="pl-thumb-info">${imgName}</div>
      `;

      thumb.addEventListener('click', () => {
        const currentStep = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
        if (currentStep === 2) {
          if (this.selectedPhotos.has(img.id)) {
            this.selectedPhotos.delete(img.id);
          } else {
            this.selectedPhotos.add(img.id);
          }
          this._renderImageList();
        } else {
          this.selectedImageId = img.id;
          this._renderImageList();
          // If a slot is selected, assign image to it
          if (this.selectedSlotIndex >= 0) {
            this._assignToSlot(this.selectedSlotIndex, img.id);
          }
        }
      });

      this.imageList.appendChild(thumb);
    });
  }

  // ── Canvas Click → Select Slot ──
  _onCanvasClick(e) {
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    if (step === 1 || step === 4) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    let clickedSlot = -1;

    for (let i = 0; i < tmpl.slots.length; i++) {
      const s = tmpl.slots[i];
      // Note: Coordinates are un-scaled relative to canvas width/height
      // Convert to local space
      const dx = x - s.cx;
      const dy = y - s.cy;
      const rot = s.rotation || 0;
      const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
      const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);

      if (localX >= -s.w/2 && localX <= s.w/2 && localY >= -s.h/2 && localY <= s.h/2) {
        clickedSlot = i;
        break;
      }
    }

    if (clickedSlot >= 0) {
      this.selectedSlotIndex = clickedSlot;

      // If an image is selected, assign it
      if (this.selectedImageId && !this.slots[clickedSlot].imageId) {
        this._assignToSlot(clickedSlot, this.selectedImageId);
        this.selectedImageId = null;
      }

      this._renderCanvas();
      this._renderSlotProps();
      this._renderImageList();
    }
  }

  _assignToSlot(slotIndex, imageId) {
    this.slots[slotIndex].imageId = imageId;
    this.slots[slotIndex].zoom = 1.0;
    this.slots[slotIndex].panX = 0;
    this.slots[slotIndex].panY = 0;
    this.slots[slotIndex].rotation = 0; // In degrees
    this.slots[slotIndex].assignedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    this.selectedImageId = null;

    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
  }

  // ── Auto Fill ──
  _autoFill() {
    let imgIndex = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].imageId && imgIndex < this.images.length) {
        this._assignToSlot(i, this.images[imgIndex].id);
        imgIndex++;
      }
    }
  }

  async _uploadTestImages(e) {
    const branch = localStorage.getItem('branchId') || 'CN01';
    let room = this.activeRoom;
    if (!room) {
      room = "Room1"; // Mặc định đẩy vào Room1 nếu chưa có room nào
    }
    const session = (this.rooms[room] && this.rooms[room].session) ? this.rooms[room].session : ('test_' + Date.now());

    
    const files = Array.from(e.target.files);
    for (let file of files) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        await fetch(`/api/stream-upload/${branch}/${room}/${session}`, {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.error("Test upload failed:", err);
      }
    }
    e.target.value = ''; // reset
  }

  _selectAll() {
    // Select all images (visual highlight)
    this.selectedImageId = null;
    this._renderImageList();
  }

  _deselectAll() {
    this.selectedImageId = null;
    this._renderImageList();
  }

  _handleImageUpload(e) {
    const files = e.target.files;
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = 'img_' + Date.now() + '_' + i;
      const url = URL.createObjectURL(file);
      this.images.push({ id, url });
    }

    this._renderImageList();
  }

  // ── Import JSON Template ──
  _importTemplateJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const t = JSON.parse(ev.target.result);
        if (t.id && t.slots) {
          // Add to customTemplates
          customTemplates[t.id] = {
            name: t.name || 'Custom Template',
            slots: t.slots.map(s => ({
              cx: s.cx !== undefined ? s.cx : (s.x + s.width/2),
              cy: s.cy !== undefined ? s.cy : (s.y + s.height/2),
              w: s.width || s.w,
              h: s.height || s.h,
              rotation: s.rotation || 0
            })),
            frame_url: t.frame_url,
            canvas_width: t.canvas_width || 1748,
            canvas_height: t.canvas_height || 2480
          };

          // Update ALL_TEMPLATES in memory for this session
          ALL_TEMPLATES[t.id] = customTemplates[t.id];

          // Reload UI
          this.currentTemplate = t.id;
          this._initMainSwiper();
          this._initTemplate();
          this._renderCanvas();
        } else {
          alert('File JSON không hợp lệ!');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Canvas Interaction ──
  _panSlot(slotIndex, dx, dy) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.imageId) return;
    
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    const slotDef = tmpl.slots[slotIndex];
    const rot = slotDef.rotation || 0;
    
    // Reverse rotate mouse movement to local coordinates
    const localDx = dx * Math.cos(-rot) - dy * Math.sin(-rot);
    const localDy = dx * Math.sin(-rot) + dy * Math.cos(-rot);

    slot.panX += localDx;
    slot.panY += localDy;
    this._clampPan(slotIndex);
    this._renderCanvas();
  }

  _zoomSlot(slotIndex, zoom) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = Math.max(0.5, Math.min(3.0, zoom));
    this._clampPan(slotIndex);
    this._renderCanvas();
    this._renderSlotProps();
  }

  _resetCrop(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return;
    slot.zoom = 1.0;
    slot.panX = 0;
    slot.panY = 0;
    this._renderCanvas();
    this._renderSlotProps();
  }

  _removeFromSlot(slotIndex) {
    this.slots[slotIndex] = { imageId: null, zoom: 1.0, panX: 0, panY: 0, assignedAt: null };
    this._renderCanvas();
    this._renderSlotProps();
    this._renderImageList();
  }

  _clampPan(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.imageId) return;

    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    const slotDef = tmpl.slots[slotIndex];
    const img = this._imageCache[slot.imageId];
    if (!img) return;

    // Calculate cover dimensions
    const isRotated = (slot.rotation === 90 || slot.rotation === 270);
    const imgW = isRotated ? img.naturalHeight : img.naturalWidth;
    const imgH = isRotated ? img.naturalWidth : img.naturalHeight;
    const { drawW, drawH } = this._calcCover(imgW, imgH, slotDef.w, slotDef.h, slot.zoom);

    const maxPanX = Math.max(0, (drawW - slotDef.w) / 2);
    const maxPanY = Math.max(0, (drawH - slotDef.h) / 2);

    slot.panX = Math.max(-maxPanX, Math.min(maxPanX, slot.panX));
    slot.panY = Math.max(-maxPanY, Math.min(maxPanY, slot.panY));
  }

  _calcCover(imgW, imgH, slotW, slotH, zoom = 1) {
    const imgRatio = imgW / imgH;
    const slotRatio = slotW / slotH;

    let drawW, drawH;
    if (imgRatio > slotRatio) {
      // Image is wider → fit height
      drawH = slotH * zoom;
      drawW = drawH * imgRatio;
    } else {
      // Image is taller → fit width
      drawW = slotW * zoom;
      drawH = drawW / imgRatio;
    }
    return { drawW, drawH };
  }

  // ── Render Slot Properties Panel ──
  _renderSlotProps() {
    if (!this.slotProps) return;
    if (this.selectedSlotIndex < 0) {
      this.slotProps.innerHTML = '<div class="pl-no-slot">Chọn một slot trên canvas để chỉnh sửa</div>';
      return;
    }

    const slot = this.slots[this.selectedSlotIndex];
    const slotNum = this.selectedSlotIndex + 1;

    if (!slot.imageId) {
      this.slotProps.innerHTML = `
        <div class="pl-prop-group">
          <span class="pl-prop-label">Slot ${slotNum}</span>
          <div class="pl-prop-value" style="color: var(--pl-text-muted);">Trống — chọn ảnh rồi click slot</div>
        </div>
      `;
      return;
    }

    const img = this.images.find(i => i.id === slot.imageId);
    const zoomPct = Math.round(slot.zoom * 100);

    this.slotProps.innerHTML = `
      <div class="pl-prop-group">
        <span class="pl-prop-label">Slot ${slotNum}</span>
        <div class="pl-prop-value">${img ? img.name : 'Unknown'}</div>
        ${slot.assignedAt ? `<div style="font-size:10px;color:var(--pl-text-muted);">Chọn lúc ${slot.assignedAt}</div>` : ''}
      </div>
      <div class="pl-prop-group">
        <span class="pl-prop-label">Zoom</span>
        <div class="pl-zoom-row">
          <input type="range" id="zoomSlider" min="50" max="300" value="${zoomPct}" step="5">
          <span class="pl-zoom-value">${zoomPct}%</span>
        </div>
      </div>
      <div class="pl-prop-actions">
        <button class="pl-prop-btn" id="btnRotateSlot">↻ Xoay ảnh</button>
        <button class="pl-prop-btn" id="btnResetCrop">↺ Reset Crop</button>
        <button class="pl-prop-btn danger" id="btnRemoveSlot">✕ Xóa ảnh khỏi slot</button>
      </div>
    `;

    // Bind zoom
    const zoomSlider = document.getElementById('zoomSlider');
    zoomSlider.addEventListener('input', () => {
      this._zoomSlot(this.selectedSlotIndex, parseInt(zoomSlider.value) / 100);
      this.slotProps.querySelector('.pl-zoom-value').textContent = zoomSlider.value + '%';
    });

    document.getElementById('btnRotateSlot').addEventListener('click', () => {
      const sData = this.slots[this.selectedSlotIndex];
      sData.rotation = ((sData.rotation || 0) + 90) % 360;
      this._renderCanvas();
    });

    document.getElementById('btnResetCrop').addEventListener('click', () => {
      this._resetCrop(this.selectedSlotIndex);
    });

    document.getElementById('btnRemoveSlot').addEventListener('click', () => {
      this._removeFromSlot(this.selectedSlotIndex);
    });
  }

  // ══════════════════════════════════════
  // Canvas Rendering
  // ══════════════════════════════════════

  _renderCanvas() {
    this._drawToCanvas(this.canvas, true);


  }

  _drawToCanvas(canvas, isPreview, overrideTemplate = null, isPreviewSwiper = false) {
    const tmpl = overrideTemplate || ALL_TEMPLATES[this.currentTemplate];
    const w = tmpl.canvas_width || A5_WIDTH;
    const h = tmpl.canvas_height || A5_HEIGHT;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    // White background (layer 1)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw slots (layer 2)
    for (let i = 0; i < tmpl.slots.length; i++) {
      const slotDef = tmpl.slots[i];
      const slotData = (overrideTemplate || step === 1) ? null : this.slots[i]; // If rendering swiper preview or step 1, no slots data

      ctx.save();
      ctx.translate(slotDef.cx, slotDef.cy);
      if (slotDef.rotation) {
        ctx.rotate(slotDef.rotation);
      }

      if (slotData && slotData.imageId && this._imageCache[slotData.imageId]) {
        // Draw assigned user photo
        const img = this._imageCache[slotData.imageId];
        this._drawImageInSlot(ctx, img, slotDef, slotData);
      } else if (step === 1 || isPreviewSwiper) {
        // Fill default image in Step 1 or swiper thumbnail
        let defaultImgToDraw = null;
        if (isPreviewSwiper && this.images && this.images.length > 0) {
           const cachedImg = this._imageCache[this.images[i % this.images.length].id];
           if (cachedImg) defaultImgToDraw = cachedImg;
        }
        if (!defaultImgToDraw && this.defaultPreviewImages && this.defaultPreviewImages.length > 0) {
           const d = this.defaultPreviewImages[i % this.defaultPreviewImages.length];
           if (d.complete && d.naturalWidth > 0) defaultImgToDraw = d;
        }

        if (defaultImgToDraw) {
           this._drawImageInSlot(ctx, defaultImgToDraw, slotDef, { zoom: 1.0, panX: 0, panY: 0, rotation: 0 });
        } else {
           // Fallback loading state
           ctx.fillStyle = '#e4e4e7';
           ctx.fillRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
        }
      } else {
        // Empty slot in Step 2 or 3
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);

        // Dashed border
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
        ctx.setLineDash([]);

        // Slot number
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Slot ${i + 1}`, 0, 0);
      }

      ctx.restore();
    }

    // Draw Overlay Frame (layer 3)
    if (isPreviewSwiper && tmpl.frame_url) {
       // In swiper, we need to load and draw the frame independently if it's an override
       const frameImg = new Image();
       frameImg.onload = () => { ctx.drawImage(frameImg, 0, 0, w, h); };
       frameImg.src = tmpl.frame_url;
       // Synchronous draw if it happens to be loaded
       if (frameImg.complete && frameImg.naturalWidth > 0) ctx.drawImage(frameImg, 0, 0, w, h);
    } else if (this.frameImageObj && !overrideTemplate) {
      ctx.drawImage(this.frameImageObj, 0, 0, w, h);
    }

    // Draw active slot highlight OVER the frame (layer 4)
    if (isPreview && this.selectedSlotIndex >= 0 && step !== 1 && step !== 4 && !isPreviewSwiper) {
       const s = tmpl.slots[this.selectedSlotIndex];
       if (s) {
         ctx.save();
         ctx.translate(s.cx, s.cy);
         if (s.rotation) ctx.rotate(s.rotation);
         ctx.strokeStyle = '#38bdf8';
         ctx.lineWidth = 12; // Thicker so it's very obvious
         ctx.strokeRect(-s.w/2, -s.h/2, s.w, s.h);
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 4;
         ctx.strokeRect(-s.w/2 + 6, -s.h/2 + 6, s.w - 12, s.h - 12);
         ctx.restore();
       }
    }
  }

  _drawImageInSlot(ctx, img, slotDef, slotData) {
    const isRotated = (slotData.rotation === 90 || slotData.rotation === 270);
    const imgW = isRotated ? img.naturalHeight : img.naturalWidth;
    const imgH = isRotated ? img.naturalWidth : img.naturalHeight;

    const { drawW, drawH } = this._calcCover(
      imgW, imgH,
      slotDef.w, slotDef.h,
      slotData.zoom
    );

    // Center + pan (relative to local cx,cy origin)
    const drawX = -drawW / 2 + slotData.panX;
    const drawY = -drawH / 2 + slotData.panY;

    // Clip to slot
    ctx.save();
    ctx.beginPath();
    ctx.rect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
    ctx.clip();
    
    if (slotData.rotation) {
      ctx.rotate(slotData.rotation * Math.PI / 180);
    }
    
    // If rotated 90 or 270, the drawing dimensions are swapped relative to the rotated context
    if (slotData.rotation === 90) {
      ctx.drawImage(img, drawY, -drawX - drawW, drawH, drawW);
    } else if (slotData.rotation === 270) {
      ctx.drawImage(img, -drawY - drawH, drawX, drawH, drawW);
    } else if (slotData.rotation === 180) {
      ctx.drawImage(img, -drawX - drawW, -drawY - drawH, drawW, drawH);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    
    ctx.restore();
  }

  // ══════════════════════════════════════
  // Export
  // ══════════════════════════════════════

  async _exportJPG() {
    this._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const exportCanvas = document.createElement('canvas');
      this._drawToCanvas(exportCanvas, false);

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `MME_A5_Print_${Date.now()}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export JPG failed:', err);
      alert('Xuất JPG thất bại.');
    }

    this._showOverlay(false);
  }

  async _exportPDF() {
    this._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const exportCanvas = document.createElement('canvas');
      this._drawToCanvas(exportCanvas, false);

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

      // jsPDF: A5 landscape/portrait
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // 148 x 210 mm
      });

      // A5 dimensions in mm
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 148, 210);
      pdf.save(`MME_A5_Print_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export PDF failed:', err);
      alert('Xuất PDF thất bại. Đảm bảo jsPDF đã được tải.');
    }

    this._showOverlay(false);
  }

  _print() {
    // Render full res first
    const exportCanvas = document.createElement('canvas');
    this._drawToCanvas(exportCanvas, false);

    // Replace the preview canvas temporarily
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    this.canvas.width = tmpl.canvas_width || A5_WIDTH;
    this.canvas.height = tmpl.canvas_height || A5_HEIGHT;
    this.ctx.drawImage(exportCanvas, 0, 0);

    window.print();

    // Restore preview
    this._renderCanvas();
  }

  _showOverlay(show) {
    this.exportOverlay.classList.toggle('visible', show);
  }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  window.printApp = new PrintLayoutApp();
});
