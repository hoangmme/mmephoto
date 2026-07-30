import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=175';
import { TemplatePicker } from '../components/TemplatePicker.js?v=175';
import { LightboxComponent } from '../components/LightboxComponent.js?v=175';
import { HeaderActions } from '../components/HeaderActions.js?v=175';
import { CrossSellBanner } from '../components/CrossSellBanner.js?v=175';
import { RoomTabsComponent } from '../components/RoomTabsComponent.js?v=175';
import { QueueModalComponent } from '../components/QueueModalComponent.js?v=175';
import { StepBannerComponent } from '../components/StepBannerComponent.js?v=175';
import { ImageListUI } from '../components/ImageListUI.js?v=175';

export const UIStepsMixin = {
  _setStep(room, step, skipSync = false) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    
    this.currentStep = step; // Always sync currentStep tab viewed
    
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
    const timerEl = document.getElementById('countdownTimer');
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
      if (roomD.queue && roomD.queue.length > 0) {
        if (!roomD.session) {
          roomD.session = roomD.activeSessionId || roomD.queue[0].id;
          roomD.activeSessionId = roomD.session;
        }
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
    const step = (isStaffMode && this.currentStep) ? this.currentStep : (roomData.step || 1);
    this.images = roomData.images || [];
    if (this.imageCount) this.imageCount.textContent = `${this.images.length} ảnh`;

    // Update main mode class
    if (mainContainer) mainContainer.className = `pl-main pl-step-mode-${step}`;

    // Control canvas container display based on step (Step 3 & Step 4 both display dual-canvas layout!)
    const canvasContainer = document.getElementById('canvasContainer');
    const mainSwiperArea = document.getElementById('mainSwiperArea');
    if (canvasContainer && mainSwiperArea) {
      if (step === 3 || step === 4) {
        canvasContainer.style.display = 'flex';
        mainSwiperArea.style.display = 'none';
      } else {
        canvasContainer.style.display = 'none';
        mainSwiperArea.style.display = 'flex';
      }
    }
    // Step 4: Shared Read-Only Official Session Component (Strictly no auto-fill)
    if (step === 4) {
      this.selectedSlotIndex = -1;
      if (roomData && roomData.queue && roomData.session) {
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess) {
          if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
            this.selectedTemplates = [...activeSess.selectedTemplates];
            this.currentTemplate = this.selectedTemplates[0];
          }
          if (activeSess.paperSize) this.paperSize = activeSess.paperSize;
          if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
            this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
          } else {
            this.canvasesState = [];
          }
          if (activeSess.selectedImages) {
            this.selectedPhotos = new Set(activeSess.selectedImages);
          }

          const s4ActiveIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
          if (this.canvasesState && this.canvasesState[s4ActiveIdx]) {
            this.slots = this.canvasesState[s4ActiveIdx].slots || [];
          }
        }
      }
      this._updateHeaderActions();
    } else {
        // Steps 1, 2, 3: Working Draft per room (Staff or User)
        if (this._loadDraftsFromStorage) this._loadDraftsFromStorage();
        const draftMap = isStaffMode ? this._staffDrafts : this._userDrafts;
        const draftKey = (roomData && roomData.session) ? `${this.activeRoom}_${roomData.session}` : null;
        const currentDraft = (draftMap && draftKey && draftMap[draftKey]) ? draftMap[draftKey] : null;
  
        if (currentDraft) {
        this.selectedTemplates = [...(currentDraft.selectedTemplates || [])];
        if (this.selectedTemplates && this.selectedTemplates.length > 0) {
          this.currentTemplate = this.selectedTemplates[0];
        }
        this.paperSize = currentDraft.paperSize || this.paperSize;
        this.canvasesState = JSON.parse(JSON.stringify(currentDraft.canvasesState || []));
        this.selectedPhotos = new Set(currentDraft.selectedPhotos || []);
        if (currentDraft.activeCanvasIndex !== undefined && currentDraft.activeCanvasIndex !== null) {
          this.activeCanvasIndex = currentDraft.activeCanvasIndex;
        }
        const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
        if (this.canvasesState && this.canvasesState[activeIdx]) {
          this.slots = this.canvasesState[activeIdx].slots || [];
          if (this.canvasesState[activeIdx].templateId) {
            this.currentTemplate = this.canvasesState[activeIdx].templateId;
          }
        }
      } else if (roomData && roomData.queue && roomData.session) {
        // First load initialization from active session if draft doesn't exist yet
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess) {
          if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
            this.selectedTemplates = [...activeSess.selectedTemplates];
            this.currentTemplate = this.selectedTemplates[0];
          }
          if (activeSess.paperSize) this.paperSize = activeSess.paperSize;
          if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
            this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
          }
          if (activeSess.selectedImages) this.selectedPhotos = new Set(activeSess.selectedImages);
          const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
          if (this.canvasesState && this.canvasesState[activeIdx]) {
            this.slots = this.canvasesState[activeIdx].slots || [];
          }
          this._syncStaffDraftState();
        }
      }
    }

    // Force clear slot selection and hide edit controls in Step 4
    if (step === 4) {
      this.selectedSlotIndex = -1;
      if (this.canvasesState) {
        this.canvasesState.forEach(cs => { if (cs) cs.selectedSlotIndex = -1; });
      }

      // Step 4 ALWAYS shows the officially committed session, not the draft
      if (roomData && roomData.queue && roomData.session) {
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess && activeSess.canvasesState) {
          this.selectedTemplates = activeSess.selectedTemplates ? [...activeSess.selectedTemplates] : this.selectedTemplates;
          if (this.selectedTemplates && this.selectedTemplates.length > 0) {
            this.currentTemplate = this.selectedTemplates[0];
          }
          this.paperSize = activeSess.paperSize || this.paperSize;
          this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
          const s4ActiveIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
          if (this.canvasesState && this.canvasesState[s4ActiveIdx]) {
            this.slots = this.canvasesState[s4ActiveIdx].slots || [];
            if (this.canvasesState[s4ActiveIdx].templateId) {
              this.currentTemplate = this.canvasesState[s4ActiveIdx].templateId;
            }
          }
          if (activeSess.selectedImages) {
            this.selectedPhotos = new Set(activeSess.selectedImages);
          }
        }
      }

      this._updateHeaderActions();
    }

    // Control panelLeft visibility and layout based on step
    if (panelLeft) {
      if (step === 1) {
        panelLeft.style.display = 'none';
      } else if (step === 4) {
        panelLeft.style.display = 'flex';
        this._renderStep4BottomPanel();
      } else {
        panelLeft.style.removeProperty('display');
        this._restoreStandardPanelLeft();
      }
    }
    // Render image list AFTER all state (Drafts, activeSession) is fully loaded!
    this._renderImageList();

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
    
    // Dual-canvas layout handles multi-template rendering automatically


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

    const canvasInfo = document.getElementById('canvasInfo');
    if (canvasInfo) {
      canvasInfo.style.display = (step === 1) ? 'block' : 'none';
    }

    const crossSell = document.getElementById('crossSellBanner');
    if (crossSell && step !== 4) {
      crossSell.style.display = 'none';
    }

    if (qrOverlay && step !== 4) {
      qrOverlay.style.display = 'none';
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

    // Ensure canvasContainer is in its default place
    if (mainSwiperArea && canvasContainer && canvasContainer.parentElement === mainSwiperArea) {
      mainSwiperArea.after(canvasContainer);
    }
    if (mainSwiperArea) mainSwiperArea.style.setProperty('display', (step === 1) ? 'flex' : 'none', 'important');
    if (step === 1 && this._initLayoutSelector) this._initLayoutSelector();
    
    if (canvasContainer) canvasContainer.style.setProperty('display', (step === 3 || step === 4) ? 'flex' : 'none', 'important');

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

    if (this._loadTemplateImages) {
      this._loadTemplateImages();
    }
  },


  _renderTabs() {
    if (!this._roomTabsComponent) {
      this._roomTabsComponent = new RoomTabsComponent('roomTabs', {
        onSelectRoom: (roomKey) => {
          this.activeRoom = roomKey;
          if (this.rooms[roomKey]) this.rooms[roomKey].hasNew = false;
          this.activeCanvasIndex = 0;
          this._updateActiveSession(roomKey, false);
          this._renderTabs();
          this._updateUIForRoom();
          this._renderCanvas();
        }
      });
    }

    const rooms = Object.keys(this.rooms || {});
    if ((!this.activeRoom || !this.rooms[this.activeRoom]) && rooms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room') || urlParams.get('roomId');
      this.activeRoom = (roomParam && this.rooms[roomParam]) ? roomParam : rooms[0];
      this._updateUIForRoom();
    }

    this._roomTabsComponent.render(this.rooms, this.activeRoom);
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



  _renderStep4BottomPanel() {
    const panelLeft = document.getElementById('panelLeft');
    if (!panelLeft) return;

    // Hide standard panel children (don't destroy them)
    const panelHeader = panelLeft.querySelector('.pl-panel-header');
    const imageList = document.getElementById('imageList');
    const panelFooter = document.getElementById('panelLeftFooter');
    const panelActions = panelLeft.querySelector('.pl-actions');
    if (panelHeader) panelHeader.style.display = 'none';
    if (imageList) imageList.style.display = 'none';
    if (panelFooter) panelFooter.style.display = 'none';
    if (panelActions) panelActions.style.display = 'none';

    // Create or reuse step4 bottom container
    let step4Bottom = document.getElementById('step4BottomContainer');
    if (!step4Bottom) {
      step4Bottom = document.createElement('div');
      step4Bottom.id = 'step4BottomContainer';
      step4Bottom.className = 'pl-step4-bottom-container';
      panelLeft.appendChild(step4Bottom);
    }

    // Move QR and CrossSell INTO step4Bottom (they live in mainSwiperArea which is hidden)
    const qrOverlay = document.getElementById('qrOverlay');
    const crossSellBanner = document.getElementById('crossSellBanner');
    if (qrOverlay && qrOverlay.parentElement !== step4Bottom) {
      step4Bottom.appendChild(qrOverlay);
    }
    if (crossSellBanner && crossSellBanner.parentElement !== step4Bottom) {
      step4Bottom.appendChild(crossSellBanner);
    }
    if (qrOverlay) qrOverlay.style.display = 'flex';
    if (crossSellBanner) crossSellBanner.style.display = 'flex';
    step4Bottom.style.display = 'flex';
  },


  _restoreStandardPanelLeft() {
    const panelLeft = document.getElementById('panelLeft');
    if (!panelLeft) return;

    // Restore standard panel children
    const panelHeader = panelLeft.querySelector('.pl-panel-header');
    const imageList = document.getElementById('imageList');
    const panelFooter = document.getElementById('panelLeftFooter');
    const panelActions = panelLeft.querySelector('.pl-actions');
    if (panelHeader) panelHeader.style.display = '';
    if (imageList) imageList.style.display = '';
    if (panelFooter) panelFooter.style.display = '';
    if (panelActions) panelActions.style.display = '';

    // Move QR and CrossSell back to mainSwiperArea
    const mainSwiperArea = document.getElementById('mainSwiperArea');
    const qrOverlay = document.getElementById('qrOverlay');
    const crossSellBanner = document.getElementById('crossSellBanner');
    
    if (mainSwiperArea && qrOverlay && qrOverlay.parentElement?.id === 'step4BottomContainer') {
      mainSwiperArea.appendChild(qrOverlay);
    }
    if (mainSwiperArea && crossSellBanner && crossSellBanner.parentElement?.id === 'step4BottomContainer') {
      mainSwiperArea.appendChild(crossSellBanner);
    }
    if (qrOverlay) qrOverlay.style.display = 'none';
    if (crossSellBanner) crossSellBanner.style.display = 'none';

    // Hide step4 bottom container
    const step4Bottom = document.getElementById('step4BottomContainer');
    if (step4Bottom) step4Bottom.style.display = 'none';
  },


  _getMaxSlots() {
    return this.paperSize === 'A4' ? 6 : 4;
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
  },


};
