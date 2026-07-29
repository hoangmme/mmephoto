import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=160';
import { TemplatePicker } from '../components/TemplatePicker.js?v=150';

export const UIMixin = {
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
      if (b && r && this.rooms[r] && this.rooms[r].session) {
        const sessId = this.rooms[r].session;
        try {
          const res = await fetch(`/api/finish-session/${b}/${r}/${encodeURIComponent(sessId)}`, { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data.activeSessionId) {
              this.rooms[r].activeSessionId = data.activeSessionId;
            } else {
              const remaining = (this.rooms[r].queue || []).filter(s => !s.finished && s.id !== sessId);
              this.rooms[r].activeSessionId = remaining.length > 0 ? remaining[0].id : null;
            }
          }
        } catch (err) { }
      }
      const lockOverlay = document.getElementById('lockOverlay');
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (r) {
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

    this.mainSwiper = document.getElementById('mainSwiper');
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

  _initOverlays() {
    if (isStaffMode) return;

    // 1. IDLE SCREENSAVER OVERLAY (2 mins no interaction -> man-cho.png)
    const screensaver = document.getElementById('idleScreensaverOverlay');
    let idleTimeout = null;
    const IDLE_TIME_MS = 120000; // 2 minutes (120,000ms)

    const resetIdleTimer = () => {
      if (screensaver && screensaver.style.display !== 'none') {
        screensaver.style.display = 'none';
      }
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        if (screensaver && !isStaffMode) {
          screensaver.style.display = 'block';
        }
      }, IDLE_TIME_MS);
    };

    ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'keydown', 'scroll', 'click'].forEach(evt => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    if (screensaver) {
      screensaver.addEventListener('click', () => {
        screensaver.style.display = 'none';
        resetIdleTimer();
      });
    }

    resetIdleTimer();

    // 2. START SESSION OVERLAY (Click start.png to start 7-min timer)
    const startOverlay = document.getElementById('startSessionOverlay');
    if (startOverlay) {
      const handleStartClick = async (e) => {
        if (e) {
          try { e.preventDefault(); } catch (err) {}
          try { e.stopPropagation(); } catch (err) {}
        }
        startOverlay.style.display = 'none';
        startOverlay.classList.add('dismissed');

        this.sessionStarted = true;
        if (this.activeRoom && this.rooms[this.activeRoom]) {
          const roomData = this.rooms[this.activeRoom];
          roomData.sessionStarted = true;
          const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
          if (activeSess) {
            activeSess.sessionStartedAt = Date.now();
          }
          if (this.resetSessionTimer) {
            try { await this.resetSessionTimer(); } catch (err) { }
          }
          this._startStepTimer(this.activeRoom, roomData.step || 1);
        }
      };

      startOverlay.addEventListener('click', handleStartClick);
      startOverlay.addEventListener('touchstart', handleStartClick, { passive: false });
    }
  }
  ,

  _openLightbox(index, imagesList) {
    this.lightboxImages = imagesList || this.images;
    this.lightboxIndex = index;
    this._updateLightboxContent();

    const overlay = document.getElementById('lightboxOverlay');
    if (overlay) overlay.classList.add('active');
  },

  _updateLightboxContent() {
    if (!this.lightboxImages || this.lightboxImages.length === 0) return;
    if (this.lightboxIndex < 0) this.lightboxIndex = 0;
    if (this.lightboxIndex >= this.lightboxImages.length) this.lightboxIndex = this.lightboxImages.length - 1;

    const imgObj = this.lightboxImages[this.lightboxIndex];
    const lightboxImg = document.getElementById('lightboxImg');
    const counter = document.getElementById('lightboxCounter');
    const selectText = document.getElementById('lightboxSelectText');

    if (lightboxImg) lightboxImg.src = imgObj.objectUrl || imgObj.url;
    if (counter) counter.textContent = `${this.lightboxIndex + 1} / ${this.lightboxImages.length}`;

    if (selectText) {
      const isSelected = this.selectedPhotos && this.selectedPhotos.has(imgObj.id);
      selectText.textContent = isSelected ? 'Bỏ chọn ảnh này' : 'Chọn ảnh này';
    }
  },

  _initLightboxEvents() {
    const overlay = document.getElementById('lightboxOverlay');
    const closeBtn = document.getElementById('btnLightboxClose');
    const prevBtn = document.getElementById('btnLightboxPrev');
    const nextBtn = document.getElementById('btnLightboxNext');
    const selectBtn = document.getElementById('btnLightboxSelect');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (overlay) overlay.classList.remove('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.lightboxIndex > 0) {
          this.lightboxIndex--;
          this._updateLightboxContent();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.lightboxImages && this.lightboxIndex < this.lightboxImages.length - 1) {
          this.lightboxIndex++;
          this._updateLightboxContent();
        }
      });
    }

    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        if (!this.lightboxImages || this.lightboxIndex < 0) return;
        const imgObj = this.lightboxImages[this.lightboxIndex];
        if (!imgObj) return;

        if (this.selectedPhotos.has(imgObj.id)) {
          this.selectedPhotos.delete(imgObj.id);
        } else {
          const maxSlots = this._getMaxSlots();
          if (maxSlots > 0 && this.selectedPhotos.size >= maxSlots) {
            alert(`Bạn chỉ được chọn tối đa ${maxSlots} ảnh cho khung này.`);
            return;
          }
          this.selectedPhotos.add(imgObj.id);
        }
        if (this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].queue) {
          const activeSess = this.rooms[this.activeRoom].queue.find(s => s.id === this.rooms[this.activeRoom].session);
          if (activeSess) {
            activeSess.selectedImages = Array.from(this.selectedPhotos);
          }
        }
        this._updateImageListUI();
        this._syncState(this.activeRoom);
        this._updateLightboxContent();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!overlay || !overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        overlay.classList.remove('active');
      } else if (e.key === 'ArrowLeft') {
        if (prevBtn) prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        if (nextBtn) nextBtn.click();
      }
    });
  },

  _initMainSwiper() {
    if (!this.mainSwiper) return;
    
    // Use the new TemplatePicker component
    if (!this._templatePicker) {
      this._templatePicker = new TemplatePicker(
        this.mainSwiper,
        ALL_TEMPLATES,
        (paperSize, selectedTemplates) => {
          this.paperSize = paperSize;
          this.selectedTemplates = selectedTemplates;
          this.currentTemplate = selectedTemplates[0];
          
          // Re-init canvasesState based on selection
          this.canvasesState = this.selectedTemplates.map(t => {
            const tmpl = ALL_TEMPLATES[t];
            const numSlots = tmpl && tmpl.slots ? tmpl.slots.length : 0;
            return {
              templateId: t,
              slots: Array(numSlots).fill(null).map(() => ({ imageId: null, zoom: 1.0, panX: 0, panY: 0, rotation: 0 })),
              selectedSlotIndex: -1
            };
          });
          this.activeCanvasIndex = 0;
          this.slots = [];
          this.selectedPhotos.clear();
          
          if (this.activeRoom && this.rooms[this.activeRoom]) {
            const roomData = this.rooms[this.activeRoom];
            if (roomData && roomData.queue && roomData.session) {
              const active = roomData.queue.find(s => s.id === roomData.session);
              if (active) {
                active.selectedTemplates = this.selectedTemplates;
                active.paperSize = this.paperSize;
                active.canvasesState = this.canvasesState;
                active.slots = [];
                active.selectedImages = [];
              }
            }
            this._updateActiveSession(this.activeRoom);
          }
          this._loadTemplateImages();
          
          // Advance to step 2
          const room = this.activeRoom;
          const roomData = room && this.rooms[room];
          if (room && roomData) {
            this._setStep(room, 2);
            this._updateUIForRoom();
            this._renderCanvas();
          }
        }
      );
    }
    
    // Sync current state to picker
    if (this.paperSize) this._templatePicker.paperSize = this.paperSize;
    if (this.selectedTemplates && this.selectedTemplates.length > 0) {
      this._templatePicker.selectedTemplates = [...this.selectedTemplates];
    } else if (this.currentTemplate) {
      this._templatePicker.selectedTemplates = [this.currentTemplate];
    }
    
    this._templatePicker.render();
    this.mainSwiper.classList.add('loaded'); // Fix opacity: 0 issue
  }
  ,

  _renderTabs() {
    const rooms = Object.keys(this.rooms);

    if ((!this.activeRoom || !this.rooms[this.activeRoom]) && rooms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room') || urlParams.get('roomId');
      if (roomParam && this.rooms[roomParam]) {
        this.activeRoom = roomParam;
      } else {
        this.activeRoom = rooms[0];
      }
      this._updateUIForRoom();
    }

    const tabsContainer = document.getElementById('roomTabs');
    if (!tabsContainer) return;
    if (!isStaffMode) {
      tabsContainer.style.display = 'none';
      return;
    } else {
      tabsContainer.style.display = 'flex';
    }
    tabsContainer.innerHTML = '';

    if (rooms.length === 0) return;

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
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--pl-bg-section)';
        btn.style.color = 'var(--pl-text)';
      }

      const roomD = this.rooms[room];
      const isReadyStep4 = roomD && roomD.step === 4 && !roomD.finished;
      if ((roomD.hasNew || isReadyStep4) && room !== this.activeRoom) {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.top = '-3px';
        dot.style.right = '-3px';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.background = '#ef4444';
        dot.style.borderRadius = '50%';
        dot.style.border = '2px solid #ffffff';
        dot.style.boxShadow = '0 0 6px rgba(239, 68, 68, 0.8)';
        dot.style.animation = 'pl-pulse 1.5s infinite';
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
  ,

  _updateUIForRoom() {
    const mainHeader = document.getElementById('mainHeader');
    const userHeader = document.getElementById('userHeader');
    const roomTabs = document.getElementById('roomTabs');

    if (isStaffMode) {
      document.body.classList.add('pl-mode-staff');
      document.body.classList.remove('pl-mode-user');
    } else {
      document.body.classList.add('pl-mode-user');
      document.body.classList.remove('pl-mode-staff');
    }

    const btnQueue = document.getElementById('btnQueueManager');
    if (btnQueue) btnQueue.style.display = isStaffMode ? 'inline-flex' : 'none';
    const btnBuilder = document.getElementById('btnBuilder');
    if (btnBuilder) btnBuilder.style.display = isStaffMode ? 'inline-flex' : 'none';

    const btnStaffDownload = document.getElementById('btnStaffDownload');
    const btnNext = document.getElementById('btnNextCustomer');

    const currentRoomD = (this.activeRoom && this.rooms[this.activeRoom]) ? this.rooms[this.activeRoom] : null;
    const hasActiveSess = !!(currentRoomD && currentRoomD.session);
    const hasQueuedSess = !!(currentRoomD && currentRoomD.queue && currentRoomD.queue.filter(s => !s.finished).length > 0);

    if (btnStaffDownload) {
      btnStaffDownload.style.display = (isStaffMode && hasActiveSess) ? 'inline-flex' : 'none';
    }
    if (btnNext) {
      btnNext.style.display = (isStaffMode && (hasQueuedSess || hasActiveSess)) ? 'inline-flex' : 'none';
    }

    this._updateActiveSession(this.activeRoom, false);

    // SAFEGUARD: Removed dangerous step 1 revert that caused user data wipe on sync.
    if (this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].step === 4) {
      if (!this.slots || !this.slots.some(s => s.imageId)) {
        console.warn("Safeguard warning: step 4 but no slots filled! (Not reverting to prevent data wipe)");
      }
    }

    const mainContainer = document.getElementById('mainContainer') || document.querySelector('.pl-main');
    const mainSwiperArea = document.getElementById('mainSwiperArea');
    const mainSwiper = this.mainSwiper || document.getElementById('mainSwiper');
    const canvasContainer = document.getElementById('canvasContainer');
    const canvasInfo = document.getElementById('canvasInfo');
    const crossSellBanner = document.getElementById('crossSellBanner');
    const qrOverlay = document.getElementById('qrOverlay');
    const lockOverlay = document.getElementById('lockOverlay');
    const stepBanner = document.getElementById('stepBanner');
    const instructionText = document.getElementById('stepInstructionText');
    const uploadBadge = document.getElementById('uploadStatusBadge');
    const uploadText = document.getElementById('uploadStatusText');
    const btnStepPrev = document.getElementById('btnStepPrev');
    const btnStepNext = document.getElementById('btnStepNext');
    const stepFooterInfo = document.getElementById('stepFooterInfo');
    const stepFooter = document.getElementById('stepFooter');
    const panelLeft = document.getElementById('panelLeft');

    if (this.activeRoom && this.rooms[this.activeRoom]) {
      const roomD = this.rooms[this.activeRoom];
      if (!roomD.session && roomD.queue && roomD.queue.length > 0) {
        roomD.session = roomD.activeSessionId || roomD.queue[0].id;
        roomD.activeSessionId = roomD.session;
        this._updateActiveSession(this.activeRoom, false);
      }
    }

    if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) {
      this.images = [];
      this._renderImageList();
      if (timerEl) timerEl.style.display = 'none';
      if (qrOverlay) qrOverlay.style.display = 'none';
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (mainContainer) mainContainer.className = 'pl-main pl-step-mode-1';
      if (panelLeft) panelLeft.style.display = 'none';
      if (instructionText) instructionText.textContent = isStaffMode
        ? '👉 Chào Staff! Chưa có phiên chụp nào trong phòng này. Vui lòng bấm "Hàng Chờ" hoặc mở phòng mới.'
        : 'Chưa có phiên chụp nào. Vui lòng chụp ảnh hoặc chạm để chọn sẵn Khung in (Frame) yêu thích trong khi chờ.';
      if (uploadBadge) uploadBadge.style.display = 'none';
      if (stepFooter) stepFooter.style.display = 'none';
      return;
    }

    const roomData = this.rooms[this.activeRoom];
    const step = roomData.step || 1;
    this.images = roomData.images;
    if (this.imageCount) this.imageCount.textContent = `${this.images.length} ảnh`;
    this._renderImageList();

    // Sync Staff Step 4 with active User session data
    if (isStaffMode && step === 4 && roomData.queue && roomData.session) {
      const activeSess = roomData.queue.find(s => s.id === roomData.session);
      if (activeSess) {
        if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
          this.selectedTemplates = [...activeSess.selectedTemplates];
          this.currentTemplate = this.selectedTemplates[0];
        }
        if (activeSess.paperSize) {
          this.paperSize = activeSess.paperSize;
        }
        if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
          this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
        }
        if (activeSess.slots && activeSess.slots.length > 0) {
          this.slots = JSON.parse(JSON.stringify(activeSess.slots));
        }
      }
    }

    // Update main mode class
    if (mainContainer) mainContainer.className = `pl-main pl-step-mode-${step}`;

    // Force clear slot selection and hide edit controls in Step 4
    if (step === 4) {
      this.selectedSlotIndex = -1;
      if (this.canvasesState) {
        this.canvasesState.forEach(cs => { if (cs) cs.selectedSlotIndex = -1; });
      }
      if (panelLeft) panelLeft.style.display = 'none';
      if (mainSwiperArea) mainSwiperArea.style.display = 'block';
      if (mainSwiper) mainSwiper.style.display = 'none';
      if (canvasInfo) canvasInfo.style.display = 'none';
      if (qrOverlay) qrOverlay.style.display = 'block';
      if (crossSellBanner) crossSellBanner.style.display = 'block';
      if (canvasContainer) canvasContainer.style.display = 'block';

      // Generate QR Code URL
      const qrImage = document.getElementById('qrImage');
      if (qrImage && roomData.session) {
        const qrUrl = `https://photo.llphotobooth.vn/download?session=${roomData.session}`;
        if (window.QRCode) {
          window.QRCode.toDataURL(qrUrl, { width: 260, margin: 1 }, (err, url) => {
            if (!err && url) qrImage.src = url;
          });
        } else {
          qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}`;
        }
      }

      this._updateHeaderActions();
    } else {
      if (qrOverlay) qrOverlay.style.display = 'none';
      if (crossSellBanner) crossSellBanner.style.display = 'none';
      if (canvasInfo) canvasInfo.style.display = 'block';
      if (panelLeft) {
        if (step === 1) {
          panelLeft.style.display = 'none';
        } else {
          panelLeft.style.removeProperty('display');
        }
      }
    }

    // (Removed dangerous async failsafe here. _applySelectionToSlots is now reliably called in _setStep)

    // Update step banner active/completed items
    if (stepBanner) {
      stepBanner.querySelectorAll('.pl-step-item').forEach(item => {
        const sNum = parseInt(item.dataset.step);
        item.classList.toggle('active', sNum === step);
        item.classList.toggle('completed', sNum < step);
        if (isStaffMode) {
          item.style.cursor = 'pointer';
        } else {
          item.style.cursor = (step < 4 && sNum < 4) ? 'pointer' : 'default';
        }

        if (sNum === 4) {
          const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
          const isStep4 = (roomData.step === 4 || roomData.remoteStep === 4 || (activeSess && activeSess.step === 4)) && !roomData.finished;
          item.classList.toggle('ready-badge', isStaffMode && isStep4);
        }
      });
    }

    // Sync template picker to current global state (skip if Staff is editing)
    if (this._templatePicker && !this._staffEditingOverride) {
      if (this.paperSize) this._templatePicker.paperSize = this.paperSize;
      if (this.selectedTemplates && this.selectedTemplates.length > 0) {
        this._templatePicker.selectedTemplates = [...this.selectedTemplates];
      } else if (this.currentTemplate) {
        this._templatePicker.selectedTemplates = [this.currentTemplate];
      }
      this._templatePicker.render();
    }
    
    // Remove the old swiper slide sync logic since we no longer use it for Step 3.
    // Instead, if we have multiple selectedTemplates, we'll render pagination tabs above the canvas.
    this._renderCanvasPagination();


    // Check if waiting for quiet period (full images uploaded)
    const isWaitingForPhotos = !roomData.timerStarted && (step === 1 || step === 2) && roomData.lastImageTime && (Date.now() - roomData.lastImageTime < 30000);
    if (uploadBadge && uploadText) {
      if (isWaitingForPhotos) {
        uploadBadge.style.display = 'inline-flex';
        uploadText.textContent = `${roomData.images.length}`;
      } else {
        uploadBadge.style.display = 'none';
      }
    }



    const paperNote = document.getElementById('paperInfoNote');
    if (paperNote) {
      paperNote.style.display = (step === 1) ? 'block' : 'none';
    }

    if (canvasInfo) {
      canvasInfo.style.display = (step === 1) ? 'block' : 'none';
    }

    if (crossSellBanner) {
      crossSellBanner.style.display = (step === 4) ? 'flex' : 'none';
    }

    if (qrOverlay) {
      qrOverlay.style.display = (step === 4) ? 'flex' : 'none';
    }

    const startOverlay = document.getElementById('startSessionOverlay');
    if (startOverlay) {
      if (!isStaffMode && roomData && roomData.session && !roomData.sessionStarted && step !== 4) {
        this.sessionStarted = false;
        startOverlay.classList.remove('dismissed');
        startOverlay.style.display = 'flex';
      } else {
        startOverlay.style.display = 'none';
      }
    }

    // Instruction text & buttons based on step
    if (instructionText && btnStepPrev && btnStepNext) {

      if (step === 1) {
        instructionText.textContent = isWaitingForPhotos
          ? '👉 Bước 1: Chọn Khổ In và Mẫu Khung In trong khi đợi tải full ảnh từ máy ảnh...'
          : '👉 Bước 1: Chọn Khổ In (A4 hoặc A5) và chạm chọn Mẫu Khung In (Frame) yêu thích của bạn';
        btnStepPrev.style.display = 'none';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = 'Tiếp theo: Chọn Ảnh <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      } else if (step === 2) {
        const filledSlots = this.selectedPhotos ? this.selectedPhotos.size : 0;
        const maxSlots = this._getMaxSlots();
        instructionText.textContent = `👉 Bước 2: Chạm vào các bức ảnh bên trái để điền vào khung in (${filledSlots}/${maxSlots} ô)`;
        btnStepPrev.style.display = 'none';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = 'Tiếp theo: Sắp Xếp <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      } else if (step === 3) {
        instructionText.textContent = '👉 Bước 3: Dùng 2 ngón tay chạm lên canvas để kéo ra/vào phóng to hoặc xoay căn chỉnh ảnh';
        btnStepPrev.style.display = 'none';
        btnStepNext.style.display = 'inline-flex';
        btnStepNext.innerHTML = isStaffMode ? '✅ Hoàn Tất (Gửi cho User)' : '✅ Hoàn Tất (Gửi cho Nhân Viên)';
      } else if (step === 4) {
        instructionText.textContent = isStaffMode
          ? '🔔 Khách đã chỉnh xong! Nhân viên vui lòng kiểm tra lại bố cục, bấm "Tải Ảnh Layout" để in cho khách và bấm "Next Customer" để đón lượt tiếp theo.'
          : '✨ Xin chúc mừng bạn đã hoàn thành! Vui lòng quét mã QR để tải bộ ảnh về điện thoại nhé.';

        const mainSwiper = document.getElementById('mainSwiper');
        if (mainSwiper) mainSwiper.style.display = 'none';

        if (isStaffMode) {
          setTimeout(() => this._renderCanvas(), 500);
        }

        btnStepPrev.style.display = 'none';
        btnStepNext.style.display = 'none';
      }
    }

    // Update global timer
    if (this._updateTimerUI) this._updateTimerUI();

    // QR Code (chỉ render & hiện ở step 4)
    if (roomData.session && step === 4) {
      this._updateQRCode(this.activeRoom, roomData.session);
    }

    // Re-adjust swiper padding after mode/layout change
    requestAnimationFrame(() => {
      if (this._updatePadding) this._updatePadding();
    });
  }
  ,

  _getMaxSlots() {
    if (this.selectedTemplates && this.selectedTemplates.length > 0) {
      return this.selectedTemplates.reduce((sum, tId) => {
        const tmpl = ALL_TEMPLATES[tId];
        return sum + (tmpl ? (tmpl.slots ? tmpl.slots.length : 0) : 0);
      }, 0);
    }
    if (this.canvasesState && this.canvasesState.length > 0) {
      return this.canvasesState.reduce((sum, cs) => {
        const tmpl = ALL_TEMPLATES[cs.templateId];
        return sum + (tmpl ? (tmpl.slots ? tmpl.slots.length : 0) : 0);
      }, 0);
    }
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    return tmpl ? (tmpl.slots ? tmpl.slots.length : 0) : 0;
  }
  ,

  _setStep(room, step, skipSync = false) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    
    // Manage _staffEditingOverride flag
    if (isStaffMode) {
      if (step < 4) {
        this._staffEditingOverride = true; // Staff going to step 1/2/3 = editing mode
      } else {
        this._staffEditingOverride = false; // Staff completing step 4 = done editing
      }
    }
    
    // Automatically apply selection to frame when entering step 3 by the user
    if (step === 3 && !isStaffMode) {
      if (this._autoFill) {
        this._autoFill();
      }
    }

    roomData.step = step;
    this._startStepTimer(room, step);
    if (this.activeRoom === room) {
      this._updateUIForRoom();
      this._renderCanvas();
    }
    if (!skipSync) {
      this._syncState(room);
    }
  }
  ,

  _updateTimerUI() {
    if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
    const roomData = this.rooms[this.activeRoom];
    const step = roomData.step || 1;
    
    const m = Math.floor(Math.max(0, roomData.timeLeft || 0) / 60).toString().padStart(2, '0');
    const s = (Math.max(0, roomData.timeLeft || 0) % 60).toString().padStart(2, '0');
    
    // Update global timer
    const globalTimerEl = document.getElementById('globalTimer');
    if (globalTimerEl) {
      if (isStaffMode || !roomData.timerStarted || step === 4) {
        globalTimerEl.style.display = 'none';
      } else {
        globalTimerEl.style.display = 'block';
        globalTimerEl.textContent = `⏱ ${m}:${s}`;
        globalTimerEl.style.color = (roomData.timeLeft <= 60) ? '#ef4444' : '#fff';
      }
    }

    const lockOverlay = document.getElementById('lockOverlay');
    if (lockOverlay) {
      if (roomData.locked && roomData.timerStarted) {
        lockOverlay.style.display = 'flex';
      } else {
        lockOverlay.style.display = 'none';
      }
    }
  },

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

    const btnRoleSwap = document.getElementById('btnRoleSwap');
    const roleSwapText = document.getElementById('roleSwapText');
    if (btnRoleSwap && roleSwapText) {
      btnRoleSwap.addEventListener('click', () => {
        setStaffMode(!isStaffMode);
        roleSwapText.textContent = isStaffMode ? 'Nhân viên' : 'Khách hàng';
        btnRoleSwap.style.borderColor = isStaffMode ? 'var(--pl-accent)' : 'var(--pl-border)';
        btnRoleSwap.style.color = isStaffMode ? 'var(--pl-accent)' : 'inherit';

        const btnQueue = document.getElementById('btnQueueManager');
        if (btnQueue) btnQueue.style.display = isStaffMode ? 'inline-flex' : 'none';

        const btnBuilder = document.getElementById('btnBuilder');
        if (btnBuilder) btnBuilder.style.display = isStaffMode ? 'inline-flex' : 'none';

        if (this.activeRoom) {
          this._updateUIForRoom();
        }
      });
    }



    const btnSelectAll = document.getElementById('btnSelectAll');
    if (btnSelectAll) btnSelectAll.addEventListener('click', () => this._selectAll());

    const btnDeselectAll = document.getElementById('btnDeselectAll');
    if (btnDeselectAll) btnDeselectAll.addEventListener('click', () => this._deselectAll());

    const btnAutoFill = document.getElementById('btnAutoFill');
    if (btnAutoFill) btnAutoFill.addEventListener('click', () => this._autoFill());

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

    const btnStaffDownload = document.getElementById('btnStaffDownload');
    if (btnStaffDownload) btnStaffDownload.addEventListener('click', () => this._exportJPG());

    const btnLockExportJPG = document.getElementById('btnLockExportJPG');
    if (btnLockExportJPG) btnLockExportJPG.addEventListener('click', () => this._exportJPG());

    const btnLockResetTimer = document.getElementById('btnLockResetTimer');
    if (btnLockResetTimer) {
      btnLockResetTimer.addEventListener('click', () => {
        const roomData = this.rooms[this.activeRoom];
        if (roomData) {
          roomData.sessionStarted = false;
          const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
          if (activeSess) {
            activeSess.sessionStartedAt = null;
          }
          if (roomData.session && this._resetSessionTimer) {
            this._resetSessionTimer(roomData.session);
          } else {
            this._setStep(this.activeRoom, 1);
            this._updateUIForRoom();
          }
        }
      });
    }

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) btnExportPDF.addEventListener('click', () => this._exportPDF());

    // Step Wizard Navigation Buttons
    const btnStepPrev = document.getElementById('btnStepPrev');
    if (btnStepPrev) {
      btnStepPrev.addEventListener('click', () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
        const cur = this.rooms[this.activeRoom].step || 1;
        if (cur === 4 && !this._state.isStaffMode()) return; // Locked at step 4
        if (cur > 1) {
          this._setStep(this.activeRoom, cur - 1);
        }
      });
    }

    const btnStepNext = document.getElementById('btnStepNext');
    if (btnStepNext) {
      btnStepNext.addEventListener('click', async () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
        const cur = this.rooms[this.activeRoom].step || 1;
        if (cur === 1) {
          if (this._templatePicker) {
            const confirmed = this._templatePicker._confirmSelection();
            if (!confirmed) {
              const req = this.paperSize === 'A4' ? '1' : '2';
              alert(`Vui lòng chọn đủ ${req} mẫu khung in (Frame) để tiếp tục!`);
              return;
            }
          } else {
            this._setStep(this.activeRoom, 2);
          }
        } else if (cur === 2) {
          const maxSlots = this._getMaxSlots();
          let selectedCount = this.selectedPhotos ? this.selectedPhotos.size : 0;

          if (maxSlots > 0 && selectedCount > maxSlots) {
            const trimmed = Array.from(this.selectedPhotos).slice(0, maxSlots);
            this.selectedPhotos = new Set(trimmed);
            selectedCount = maxSlots;
            if (this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].queue) {
              const activeSess = this.rooms[this.activeRoom].queue.find(s => s.id === this.rooms[this.activeRoom].session);
              if (activeSess) {
                activeSess.selectedImages = trimmed;
              }
            }
          }

          if (this._autoFill) this._autoFill();
          this._setStep(this.activeRoom, 3);
        } else if (cur === 3) {
          const roomData = this.rooms[this.activeRoom];
          if (roomData) roomData.step = 4;
          if (this._syncStateDirect) {
            await this._syncStateDirect(this.activeRoom);
          } else {
            this._syncState(this.activeRoom);
          }
          await this._uploadFinalFrame();
          this._setStep(this.activeRoom, 4, true);
        }
      });
    }

    const stepBanner = document.getElementById('stepBanner');
    if (stepBanner) {
      stepBanner.querySelectorAll('.pl-step-item').forEach(item => {
        item.addEventListener('click', () => {
          if (!this.activeRoom || !this.rooms[this.activeRoom] || !this.rooms[this.activeRoom].session) return;
          const targetStep = parseInt(item.dataset.step);
          if (!targetStep) return;

          const roomData = this.rooms[this.activeRoom];
          const currentStep = roomData.step || 1;

          if (currentStep === 1 && targetStep > 1) {
            if (this._templatePicker) {
              const confirmed = this._templatePicker._confirmSelection();
              if (!confirmed) {
                const req = this.paperSize === 'A4' ? '1' : '2';
                alert(`Vui lòng chọn đủ ${req} mẫu khung in (Frame) để tiếp tục!`);
                return;
              }
            }
          }

          if (currentStep === 2 && targetStep === 3) {
            if (this._autoFill) this._autoFill();
          }

          if (!isStaffMode) {
            if (currentStep === 4) return; // User cannot leave step 4
            if (targetStep === 4) return; // User must use Next button to reach step 4
            
            this._setStep(this.activeRoom, targetStep, false);
          } else {
            if (targetStep >= 1 && targetStep <= 4) {
              // Staff clicking step banner items only previews locally for Staff (skipSync = true)
              this._setStep(this.activeRoom, targetStep, true);
            }
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

    // Canvas Drag & Canva Rotate Handle support (Mouse & Touch)
    let isDragging = false, isRotatingSlot = false;
    let dragStartX, dragStartY, dragSlot;
    let rotateStartAngle = 0, initialSlotRot = 0, touchRotateStartTime = 0;

    const bindCanvasEvents = (canvasEl, cIdx) => {
      if (!canvasEl) return;

      const setActive = () => {
        if (this.activeCanvasIndex !== cIdx) {
          this.activeCanvasIndex = cIdx;
          this.canvas = canvasEl;
          this.currentTemplate = this.selectedTemplates ? this.selectedTemplates[cIdx] : this.currentTemplate;
          if (this.canvasesState && this.canvasesState[cIdx]) {
            this.slots = this.canvasesState[cIdx].slots || [];
            this.selectedSlotIndex = this.canvasesState[cIdx].selectedSlotIndex || -1;
          }
          this._renderCanvas();
        } else {
          this.canvas = canvasEl; // ensure `this.canvas` points to the target
        }
      };

      // Header Action Buttons (Xoay 90° & Reset 0°)
      const btnRot = document.getElementById('btnRotate90_' + cIdx);
      if (btnRot) {
        btnRot.addEventListener('click', (e) => {
          e.stopPropagation();
          setActive();
          let targetSlot = (this.canvasesState && this.canvasesState[cIdx])
            ? this.canvasesState[cIdx].selectedSlotIndex
            : this.selectedSlotIndex;

          if (targetSlot < 0 && this.slots) {
            targetSlot = this.slots.findIndex(s => s && s.imageId);
            if (targetSlot < 0) targetSlot = 0;
          }
          if (targetSlot >= 0 && this.slots && this.slots[targetSlot]) {
            this.selectedSlotIndex = targetSlot;
            if (this.canvasesState && this.canvasesState[cIdx]) {
              this.canvasesState[cIdx].selectedSlotIndex = targetSlot;
            }
            const sData = this.slots[targetSlot];
            sData.rotation = ((sData.rotation || 0) + 90) % 360;
            this._clampPan(targetSlot);
            this._renderCanvas();
            this._renderSlotProps();
            this._updateImageListUI();
          }
        });
      }

      const btnReset = document.getElementById('btnReset0_' + cIdx);
      if (btnReset) {
        btnReset.addEventListener('click', (e) => {
          e.stopPropagation();
          setActive();
          let targetSlot = (this.canvasesState && this.canvasesState[cIdx])
            ? this.canvasesState[cIdx].selectedSlotIndex
            : this.selectedSlotIndex;

          if (targetSlot < 0 && this.slots) {
            targetSlot = this.slots.findIndex(s => s && s.imageId);
            if (targetSlot < 0) targetSlot = 0;
          }
          if (targetSlot >= 0 && this.slots && this.slots[targetSlot]) {
            this.selectedSlotIndex = targetSlot;
            if (this.canvasesState && this.canvasesState[cIdx]) {
              this.canvasesState[cIdx].selectedSlotIndex = targetSlot;
            }
            const sData = this.slots[targetSlot];
            sData.rotation = 0;
            this._clampPan(targetSlot);
            this._renderCanvas();
            this._renderSlotProps();
            this._updateImageListUI();
          }
        });
      }

      // Canvas click → select slot
      canvasEl.addEventListener('click', (e) => {
        setActive();
        this._onCanvasClick(e);
      });

    // Desktop Mouse Drag & Rotate
    canvasEl.addEventListener('mousedown', (e) => {
      setActive();
      const roomData = this.activeRoom && this.rooms && this.rooms[this.activeRoom];
      const step = roomData ? (roomData.step || 3) : (this.currentStep || 3);
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;

      const tmpl = ALL_TEMPLATES[this.currentTemplate];
      const slotDef = tmpl ? tmpl.slots[this.selectedSlotIndex] : null;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

        // Check if mouse hit Canva rotate handle (tính theo vị trí lật tự động)
        if (slotDef && slot) {
          let halfH = slotDef.h / 2;
          if (slot.imageId && this._imageCache && this._imageCache[slot.imageId]) {
            const img = this._imageCache[slot.imageId];
            if (img.naturalWidth && img.naturalHeight) {
              const cover = this._calcCover(img.naturalWidth, img.naturalHeight, slotDef.w, slotDef.h, slot.zoom || 1.0);
              halfH = cover.drawH / 2;
            }
          }

          const imageCenterY = slotDef.cy + (slot.panY || 0);
          const isNearBottom = (imageCenterY + halfH + 110 > (this.canvas ? this.canvas.height : 2480) - 40);
          const handleSign = isNearBottom ? -1 : 1;
          const handleOffsetY = handleSign * (halfH + 85);

          let dx = x - slotDef.cx;
          let dy = y - slotDef.cy;
          const slotRotRad = slotDef.rotation || 0;
          let localX = dx * Math.cos(-slotRotRad) - dy * Math.sin(-slotRotRad);
          let localY = dx * Math.sin(-slotRotRad) + dy * Math.cos(-slotRotRad);

          localX -= (slot.panX || 0);
          localY -= (slot.panY || 0);

          const imgRotRad = ((slot.rotation || 0) * Math.PI) / 180;
          const imgX = localX * Math.cos(-imgRotRad) - localY * Math.sin(-imgRotRad);
          const imgY = localX * Math.sin(-imgRotRad) + localY * Math.cos(-imgRotRad);

          const distHandle = Math.hypot(imgX, imgY - handleOffsetY);

          if (distHandle <= 65) {
            isRotatingSlot = true;
            touchRotateStartTime = Date.now();
            rotateStartAngle = Math.atan2(y - (slotDef.cy + (slot.panY || 0)), x - (slotDef.cx + (slot.panX || 0))) * (180 / Math.PI);
            initialSlotRot = slot.rotation || 0;
            this.canvas.style.cursor = 'grab';
            return;
          }
        }

      isDragging = true;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      dragSlot = this.selectedSlotIndex;
      this.canvas.style.cursor = 'grabbing';
    });

    canvasEl.addEventListener('mousemove', (e) => {
      setActive();
      if (isRotatingSlot && this.selectedSlotIndex >= 0) {
        const slot = this.slots[this.selectedSlotIndex];
        const tmpl = ALL_TEMPLATES[this.currentTemplate];
        const slotDef = tmpl ? tmpl.slots[this.selectedSlotIndex] : null;
        if (slot && slotDef) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = this.canvas.width / rect.width;
          const scaleY = this.canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;

          const currentAngle = Math.atan2(y - slotDef.cy, x - slotDef.cx) * (180 / Math.PI);
          let delta = currentAngle - rotateStartAngle;
          let rawRot = (initialSlotRot + delta) % 360;
          if (rawRot < 0) rawRot += 360;

          // Snap 90deg nếu gần các góc vuông 0, 90, 180, 270
          [0, 90, 180, 270, 360].forEach(target => {
            if (Math.abs(rawRot - target) < 6) rawRot = target % 360;
          });

          slot.rotation = Math.round(rawRot);
          this._clampPan(this.selectedSlotIndex);
          if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
        }
        return;
      }

      if (!isDragging) return;
      const scale = this.canvas.width / this.canvas.offsetWidth;
      const dx = (e.offsetX - dragStartX) * scale;
      const dy = (e.offsetY - dragStartY) * scale;
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      this._panSlot(dragSlot, dx, dy);
    });

    const endMouseDrag = () => {
      if (isRotatingSlot && this.selectedSlotIndex >= 0) {
        if (Date.now() - touchRotateStartTime < 250) {
          const slot = this.slots[this.selectedSlotIndex];
          if (slot) {
            slot.rotation = (slot.rotation + 90) % 360;
            this._clampPan(this.selectedSlotIndex);
            if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
          }
        }
      }
      isDragging = false;
      isRotatingSlot = false;
      this.canvas.style.cursor = '';
    };

    canvasEl.addEventListener('mouseup', endMouseDrag);
    canvasEl.addEventListener('mouseleave', endMouseDrag);

    // Touch support (iOS / iPad): Smooth 1-finger Pan & Canva Rotate Handle, 2-finger Pinch Zoom (No Rotation Jitter)
    let touchStartX, touchStartY;
    let initialPinchDistance = 0;
    let initialSlotZoom = 1.0;

    canvasEl.addEventListener('touchstart', (e) => {
      setActive();
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const tmpl = ALL_TEMPLATES[this.currentTemplate];
      const slotDef = tmpl ? tmpl.slots[this.selectedSlotIndex] : null;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        // Check hit Canva rotate handle on Touch (tính theo vị trí lật tự động)
        if (slotDef && slot) {
          let halfH = slotDef.h / 2;
          if (slot.imageId && this._imageCache && this._imageCache[slot.imageId]) {
            const img = this._imageCache[slot.imageId];
            if (img.naturalWidth && img.naturalHeight) {
              const cover = this._calcCover(img.naturalWidth, img.naturalHeight, slotDef.w, slotDef.h, slot.zoom || 1.0);
              halfH = cover.drawH / 2;
            }
          }

          const imageCenterY = slotDef.cy + (slot.panY || 0);
          const isNearBottom = (imageCenterY + halfH + 110 > (this.canvas ? this.canvas.height : 2480) - 40);
          const handleSign = isNearBottom ? -1 : 1;
          const handleOffsetY = handleSign * (halfH + 85);

          let dx = x - slotDef.cx;
          let dy = y - slotDef.cy;
          const slotRotRad = slotDef.rotation || 0;
          let localX = dx * Math.cos(-slotRotRad) - dy * Math.sin(-slotRotRad);
          let localY = dx * Math.sin(-slotRotRad) + dy * Math.cos(-slotRotRad);

          localX -= (slot.panY || 0);
          localY -= (slot.panY || 0);

          const imgRotRad = ((slot.rotation || 0) * Math.PI) / 180;
          const imgX = localX * Math.cos(-imgRotRad) - localY * Math.sin(-imgRotRad);
          const imgY = localX * Math.sin(-imgRotRad) + localY * Math.cos(-imgRotRad);

          const distHandle = Math.hypot(imgX, imgY - handleOffsetY);

          if (distHandle <= 70) {
            isRotatingSlot = true;
            touchRotateStartTime = Date.now();
            rotateStartAngle = Math.atan2(y - (slotDef.cy + (slot.panY || 0)), x - (slotDef.cx + (slot.panX || 0))) * (180 / Math.PI);
            initialSlotRot = slot.rotation || 0;
            e.preventDefault();
            return;
          }
        }

        isRotatingSlot = false;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      } else if (e.touches.length === 2) {
        isRotatingSlot = false;
        const t0 = e.touches[0], t1 = e.touches[1];
        initialPinchDistance = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        initialSlotZoom = slot.zoom || 1.0;
      }
    }, { passive: false });

    canvasEl.addEventListener('touchmove', (e) => {
      setActive();
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const tmpl = ALL_TEMPLATES[this.currentTemplate];
      const slotDef = tmpl ? tmpl.slots[this.selectedSlotIndex] : null;

      if (isRotatingSlot && e.touches.length === 1 && slotDef) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        const currentAngle = Math.atan2(y - slotDef.cy, x - slotDef.cx) * (180 / Math.PI);
        let delta = currentAngle - rotateStartAngle;
        let rawRot = (initialSlotRot + delta) % 360;
        if (rawRot < 0) rawRot += 360;

        [0, 90, 180, 270, 360].forEach(target => {
          if (Math.abs(rawRot - target) < 6) rawRot = target % 360;
        });

        slot.rotation = Math.round(rawRot);
        this._clampPan(this.selectedSlotIndex);
        if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && !isRotatingSlot) {
        const touch = e.touches[0];
        const scale = this.canvas.width / this.canvas.offsetWidth;
        const dx = (touch.clientX - touchStartX) * scale;
        const dy = (touch.clientY - touchStartY) * scale;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        this._panSlot(this.selectedSlotIndex, dx, dy);
        e.preventDefault();
      } else if (e.touches.length === 2 && initialPinchDistance > 0) {
        // Pure Pinch Zoom (No Rotation Gesture -> 100% Smooth on iOS)
        const t0 = e.touches[0], t1 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const scaleFactor = currentDist / initialPinchDistance;
        const newZoom = Math.max(0.3, Math.min(4.0, initialSlotZoom * scaleFactor));

        slot.zoom = newZoom;
        this._clampPan(this.selectedSlotIndex);
        if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
        e.preventDefault();
      }
    }, { passive: false });

    canvasEl.addEventListener('touchend', (e) => {
      setActive();
      if (isRotatingSlot && this.selectedSlotIndex >= 0) {
        if (Date.now() - touchRotateStartTime < 250) {
          const slot = this.slots[this.selectedSlotIndex];
          if (slot) {
            slot.rotation = (slot.rotation + 90) % 360;
            this._clampPan(this.selectedSlotIndex);
            if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
          }
        }
      }
      isRotatingSlot = false;
    });

    // Mouse wheel zoom support for desktop testing/usage
    canvasEl.addEventListener('wheel', (e) => {
      setActive();
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this._zoomSlot(this.selectedSlotIndex, Math.max(0.3, Math.min(4.0, (slot.zoom || 1.0) + delta)));
      e.preventDefault();
    }, { passive: false });
    }; // end bindCanvasEvents

    bindCanvasEvents(document.getElementById('printCanvas0'), 0);
    bindCanvasEvents(document.getElementById('printCanvas1'), 1);
  }

  // ── Load Batch from IndexedDB ──
  ,

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

  _initTemplate() {
    const tmpl = ALL_TEMPLATES[this.currentTemplate];
    if (!tmpl) return;

    this._loadTemplateImages();

    const oldSlots = [...(this.slots || [])];
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    this.slots = tmpl.slots.map((s, i) => ({
      imageId: (oldSlots[i] && oldSlots[i].imageId) ? oldSlots[i].imageId : null,
      zoom: (oldSlots[i] && step > 1) ? (oldSlots[i].zoom || 1.0) : 1.0,
      panX: (oldSlots[i] && step > 1) ? (oldSlots[i].panX || 0) : 0,
      panY: (oldSlots[i] && step > 1) ? (oldSlots[i].panY || 0) : 0,
      assignedAt: (oldSlots[i] && step > 1) ? oldSlots[i].assignedAt : null
    }));

    // Don't auto-select first slot to avoid accidental overwrites
    this.selectedSlotIndex = -1;

    // Auto-fill new slots only if we are in Step 3 or 4 (user expects photos to stay)
    const hasEmptySlots = this.slots.some(s => !s.imageId);
    if (step >= 3 && hasEmptySlots) {
      setTimeout(() => {
        this._autoFill();
        this._renderCanvas();
      }, 50);
    }
  }

  // ── Render Image List ──
  ,

  _renderCanvasPagination() {
    // Disabled in favor of dual-canvas layout
  },

  _renderImageList() {
    this.imageList.innerHTML = '';
    const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    let imagesToRender = this.images;
    if (step === 3) {
      // At Step 3, show ALL selected photos so users can swap them (even if not currently in a slot)
      if (this.selectedPhotos && this.selectedPhotos.size > 0) {
        imagesToRender = this.images.filter(img => this.selectedPhotos.has(img.id));
      } else {
        // Fallback: if no selection was made, show all images
        imagesToRender = this.images;
      }
    }

    imagesToRender.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      thumb.dataset.id = img.id;

      const srcUrl = img.objectUrl || img.url;
      const imgName = img.name || img.id;

      const zoomBtnHtml = (step === 3 || step === 4) ? '' : `
        <button class="pl-thumb-zoom-btn" title="Xem phóng to ảnh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
        </button>
      `;

      thumb.innerHTML = `
        <img src="${srcUrl}" alt="${imgName}">
        ${zoomBtnHtml}
        <div class="pl-thumb-info">${imgName}</div>
      `;

      const zoomBtn = thumb.querySelector('.pl-thumb-zoom-btn');
      if (zoomBtn) {
        zoomBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._openLightbox(idx, imagesToRender);
        });
      }

      thumb.addEventListener('click', () => {
        const currentStep = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
        if (currentStep === 4 && !this._state.isStaffMode()) return;

        if (currentStep === 2) {
          if (this.selectedPhotos.has(img.id)) {
            this.selectedPhotos.delete(img.id);
          } else {
            const maxSlots = this._getMaxSlots();
            if (maxSlots > 0 && this.selectedPhotos.size >= maxSlots) {
              // Auto-deselect oldest photo to make room for new one (FIFO)
              const firstItem = this.selectedPhotos.values().next().value;
              if (firstItem) {
                this.selectedPhotos.delete(firstItem);
              }
            }
            this.selectedPhotos.add(img.id);
          }
          if (this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].queue) {
            const activeSess = this.rooms[this.activeRoom].queue.find(s => s.id === this.rooms[this.activeRoom].session);
            if (activeSess) {
              activeSess.selectedImages = Array.from(this.selectedPhotos);
            }
          }
          this._updateImageListUI();
          this._syncState(this.activeRoom);
        } else {
          this.selectedImageId = img.id;
          // Find slot that contains this image in active canvas or any canvas
          let foundSlotIdx = -1;
          let foundCanvasIdx = this.activeCanvasIndex || 0;

          if (this.canvasesState) {
            this.canvasesState.forEach((cState, cIdx) => {
              if (cState.slots) {
                const idxInState = cState.slots.findIndex(s => s && s.imageId === img.id);
                if (idxInState >= 0 && foundSlotIdx < 0) {
                  foundSlotIdx = idxInState;
                  foundCanvasIdx = cIdx;
                }
              }
            });
          }

          if (foundSlotIdx >= 0) {
            this.activeCanvasIndex = foundCanvasIdx;
            this.canvas = document.getElementById('printCanvas' + foundCanvasIdx) || this.canvas;
            this.selectedSlotIndex = foundSlotIdx;
            if (this.canvasesState && this.canvasesState[foundCanvasIdx]) {
              this.canvasesState[foundCanvasIdx].selectedSlotIndex = foundSlotIdx;
              this.slots = this.canvasesState[foundCanvasIdx].slots;
            }
            this.selectedImageId = null;
            this._renderCanvas();
            this._renderSlotProps();
          } else if (this.selectedSlotIndex >= 0) {
            this._assignToSlot(this.selectedSlotIndex, img.id);
            this.selectedImageId = null;
          } else {
            if (this.slots) {
               let idx = this.slots.findIndex(s => !s || !s.imageId);
               if (idx < 0) idx = 0;
               this._assignToSlot(idx, img.id);
               this.selectedImageId = null;
            }
          }
          this._updateImageListUI();
        }
      });

      this.imageList.appendChild(thumb);
    });

    this._updateImageListUI();
  }
  ,

  _updateImageListUI() {
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));
    const activeSlotImageId = (this.selectedSlotIndex >= 0 && this.slots && this.slots[this.selectedSlotIndex]) ? this.slots[this.selectedSlotIndex].imageId : null;

    if (step === 2) {
      const instructionText = document.getElementById('stepInstructionText');
      if (instructionText) {
        const maxSlots = this._getMaxSlots() || (this.slots ? this.slots.length : 0);
        const filledSlots = this.selectedPhotos ? this.selectedPhotos.size : 0;
        instructionText.textContent = `👉 Bước 2: Chạm vào các bức ảnh bên trái để điền vào khung in (${filledSlots}/${maxSlots} ô)`;
      }
    }

    Array.from(this.imageList.children).forEach(thumb => {
      const imgId = thumb.dataset.id;
      if (!imgId) return;

      // Reset classes & badges
      thumb.className = 'pl-thumb';
      const existingBadge = thumb.querySelector('.pl-thumb-badge');
      if (existingBadge) existingBadge.remove();

      if (step === 2) {
        if (this.selectedPhotos.has(imgId)) {
          thumb.classList.add('selected');
          const badge = document.createElement('div');
          badge.className = 'pl-thumb-badge';
          badge.textContent = Array.from(this.selectedPhotos).indexOf(imgId) + 1;
          thumb.appendChild(badge);
        }
      } else {
        if (imgId === this.selectedImageId || imgId === activeSlotImageId) {
          thumb.classList.add('selected');
        }
        if (usedIds.has(imgId)) thumb.classList.add('used');
      }
    });

    this._updateHeaderActions();
  },

  _updateHeaderActions() {
    const currentStep = (this.activeRoom && this.rooms && this.rooms[this.activeRoom])
      ? (this.rooms[this.activeRoom].step || 1)
      : (this.currentStep || 1);

    [0, 1].forEach(cIdx => {
      const actionsEl = document.getElementById('canvasActions' + cIdx);
      if (!actionsEl) return;

      if (currentStep === 4) {
        actionsEl.style.display = 'none';
        return;
      }

      const activeSlotIdx = (this.canvasesState && this.canvasesState[cIdx])
        ? this.canvasesState[cIdx].selectedSlotIndex
        : (cIdx === (this.activeCanvasIndex || 0) ? this.selectedSlotIndex : -1);

      if (cIdx === (this.activeCanvasIndex || 0) && activeSlotIdx >= 0) {
        actionsEl.style.display = 'flex';
      } else {
        actionsEl.style.display = 'none';
      }
    });
  }

  // ── Canvas Click → Select Slot ──
  ,

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
  ,

  _selectAll() {
    // Select all images (visual highlight)
    this.selectedImageId = null;
    this._renderImageList();
  }
  ,

  _deselectAll() {
    this.selectedImageId = null;
    this._renderImageList();
  }
  ,

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
  ,

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
  ,

};
