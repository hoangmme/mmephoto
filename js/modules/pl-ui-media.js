import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=242';
import { TemplatePicker } from '../components/TemplatePicker.js?v=242';
import { LightboxComponent } from '../components/LightboxComponent.js?v=242';
import { HeaderActions } from '../components/HeaderActions.js?v=242';
import { CrossSellBanner } from '../components/CrossSellBanner.js?v=242';
import { RoomTabsComponent } from '../components/RoomTabsComponent.js?v=242';
import { QueueModalComponent } from '../components/QueueModalComponent.js?v=242';
import { StepBannerComponent } from '../components/StepBannerComponent.js?v=242';
import { ImageListUI } from '../components/ImageListUI.js?v=242';

export const UIMediaMixin = {
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

    // 2. START SESSION OVERLAY (Click start button to start 7-min timer)
    const startOverlay = document.getElementById('startSessionOverlay');
    const startBtn = document.getElementById('btnStartSession') || startOverlay;
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
          roomData.timerStarted = true;
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

      if (startBtn) {
        startBtn.addEventListener('click', handleStartClick);
        startBtn.addEventListener('touchstart', handleStartClick, { passive: false });
      }
    }
  }
  ,


  _initLightboxEvents() {
    if (!this._lightboxComponent) {
      this._lightboxComponent = new LightboxComponent({
        isImageSelected: (imgId) => this.selectedPhotos && this.selectedPhotos.has(imgId),
        onSelectToggle: (imgObj) => {
          if (!imgObj) return;
          if (this.selectedPhotos.has(imgObj.id)) {
            this.selectedPhotos.delete(imgObj.id);
          } else {
            const maxSlots = this._getMaxSlots();
            if (maxSlots > 0 && this.selectedPhotos.size >= maxSlots) {
              alert(`Bạn đã chọn đủ ${maxSlots} bức ảnh cho bố cục khung in này. Vui lòng bỏ chọn bớt ảnh trước khi chọn ảnh mới!`);
              return;
            }
            this.selectedPhotos.add(imgObj.id);
          }
          this._updateImageListUI();
          if (this._syncStaffDraftState) this._syncStaffDraftState();
        }
      });
    }
  },


  _openLightbox(index, imagesList) {
    this._initLightboxEvents();
    this._lightboxComponent.open(imagesList || this.images, index);
  },


  _initMainSwiper() {
    this._initLayoutSelector();
  },

  _initLayoutSelector() {
    const layoutSelector = document.getElementById('layoutSelector');
    if (!layoutSelector) return;
    
    this.selectedLayoutOption = this.selectedLayoutOption || 1;
    this.selectedLayoutTemplates = this.selectedLayoutTemplates || {
      a4: 'a4-1',
      a5_top: 'a5-1',
      a5_bottom: 'template-3'
    };

    const opt1 = document.getElementById('layoutOpt1');
    const opt2 = document.getElementById('layoutOpt2');
    
this._syncLayoutSelection = () => {
      if (this.selectedLayoutOption === 1) {
        this.paperSize = 'A4';
        this.selectedTemplates = [this.selectedLayoutTemplates.a4];
      } else {
        this.paperSize = 'A5';
        this.selectedTemplates = [this.selectedLayoutTemplates.a5_top, this.selectedLayoutTemplates.a5_bottom];
      }
      this.currentTemplate = this.selectedTemplates[0];
    };

    const updateUI = () => {
      this._syncLayoutSelection();
      if (opt1) opt1.classList.toggle('active', this.selectedLayoutOption === 1);
      if (opt2) opt2.classList.toggle('active', this.selectedLayoutOption === 2);
      
      const tmpls = (typeof ALL_TEMPLATES !== 'undefined' ? ALL_TEMPLATES : null) || (typeof window !== 'undefined' ? window.ALL_TEMPLATES : null) || {};
      
      const img1 = document.getElementById('imgLayout1_0');
      if (img1 && tmpls[this.selectedLayoutTemplates.a4]) {
        img1.src = tmpls[this.selectedLayoutTemplates.a4].frame_url;
      }
      
      const img2_0 = document.getElementById('imgLayout2_0');
      if (img2_0 && tmpls[this.selectedLayoutTemplates.a5_top]) {
        img2_0.src = tmpls[this.selectedLayoutTemplates.a5_top].frame_url;
      }
      
      const img2_1 = document.getElementById('imgLayout2_1');
      if (img2_1 && tmpls[this.selectedLayoutTemplates.a5_bottom]) {
        img2_1.src = tmpls[this.selectedLayoutTemplates.a5_bottom].frame_url;
      }
    };
    
    updateUI();
    setTimeout(updateUI, 100);

    if (!this._templatePickerModal) {
      const tmpls = (typeof ALL_TEMPLATES !== 'undefined' ? ALL_TEMPLATES : null) || (typeof window !== 'undefined' ? window.ALL_TEMPLATES : null) || {};
      this._templatePickerModal = new TemplatePicker(tmpls);
    }

    if (!layoutSelector._hasEventDelegation) {
      layoutSelector._hasEventDelegation = true;
      layoutSelector.addEventListener('click', (e) => {
        let frameEl = e.target.closest('[data-frame-type]');
        if (!frameEl) {
          const fixedEl = e.target.closest('#previewLayout2_0, [data-fixed="true"]');
          if (fixedEl) {
            frameEl = document.getElementById('previewLayout2_1') || fixedEl;
          }
        }
        if (frameEl) {
          e.stopPropagation();
          const allowedType = frameEl.getAttribute('data-frame-type');
          const frameIndex = frameEl.getAttribute('data-frame-index');
          
          this.selectedLayoutOption = (allowedType === 'a4') ? 1 : 2;
          updateUI();
          
          const templateKey = (allowedType === 'a4') ? 'a4' : (frameIndex === '0' ? 'a5_top' : 'a5_bottom');
          const tmpls = (typeof ALL_TEMPLATES !== 'undefined' ? ALL_TEMPLATES : null) || (typeof window !== 'undefined' ? window.ALL_TEMPLATES : null) || {};
          
          this._templatePickerModal.templates = tmpls;
          const excludeKey = (allowedType === 'a5') ? this.selectedLayoutTemplates.a5_top : null;
          this._templatePickerModal.showModal(allowedType, (selectedKey) => {
            this.selectedLayoutTemplates[templateKey] = selectedKey;
            updateUI();
          }, excludeKey);
          return;
        }

        const optEl = e.target.closest('.pl-layout-option');
        if (optEl) {
          const layout = parseInt(optEl.getAttribute('data-layout'), 10);
          if (layout) {
            this.selectedLayoutOption = layout;
            updateUI();
          }
        }
      });
    }
  }
  ,


  _renderImageList() {
    if (!this._imageListUI) {
      this._imageListUI = new ImageListUI({
        container: this.imageList,
        onPhotoClick: (img) => {
          const currentStep = (isStaffMode && this.currentStep)
            ? this.currentStep
            : ((this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1);
          if (currentStep === 4 && !isStaffMode) return;

          if (currentStep === 2) {
            if (this.selectedPhotos.has(img.id)) {
              this.selectedPhotos.delete(img.id);
            } else {
              const maxSlots = this._getMaxSlots();
              if (maxSlots > 0 && this.selectedPhotos.size >= maxSlots) {
                alert(`Bạn đã chọn đủ ${maxSlots} bức ảnh cho bố cục khung in này. Vui lòng bỏ chọn bớt ảnh nếu muốn chọn ảnh khác!`);
                return;
              }
              this.selectedPhotos.add(img.id);
            }
            this._updateImageListUI();
            if (this._syncStaffDraftState) this._syncStaffDraftState();
          } else {
            const activeCIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
            if (!this.canvasesState || !this.canvasesState[activeCIdx]) {
              if (!this.canvasesState) this.canvasesState = [];
              if (!this.canvasesState[activeCIdx]) this.canvasesState[activeCIdx] = { templateId: this.currentTemplate, slots: [], selectedSlotIndex: -1 };
            }
            this.slots = this.canvasesState[activeCIdx].slots || [];
            
            let targetSlot = this.canvasesState[activeCIdx].selectedSlotIndex;
            if (targetSlot === undefined || targetSlot === null || targetSlot < 0) {
              targetSlot = this.selectedSlotIndex;
            }

            if (targetSlot >= 0) {
              // Slot IS selected on active canvas -> assign photo into that slot!
              this._assignToSlot(targetSlot, img.id, false, activeCIdx);
            } else {
              // No slot selected -> find first empty slot on ACTIVE canvas (never jump to other canvas)
              let emptySlotIdx = this.slots.findIndex(s => !s || !s.imageId);
              if (emptySlotIdx < 0) emptySlotIdx = 0; // fallback to slot 0 of active canvas
              this._assignToSlot(emptySlotIdx, img.id, false, activeCIdx);
            }
            this._updateImageListUI();
          }
        },
        onZoomClick: (idx, imagesToRender) => {
          this._openLightbox(idx, imagesToRender);
        }
      });
    }

    const currentStep = (isStaffMode && this.currentStep)
      ? this.currentStep
      : ((this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1);

    let imagesToRender = this.images;
    if (currentStep === 3 && this.selectedPhotos && this.selectedPhotos.size > 0) {
      imagesToRender = this.images.filter(img => this.selectedPhotos.has(img.id));
    }

    this._imageListUI.render({
      images: imagesToRender,
      selectedPhotos: this.selectedPhotos,
      selectedSlotImageId: (this.slots && this.selectedSlotIndex >= 0 && this.slots[this.selectedSlotIndex])
        ? this.slots[this.selectedSlotIndex].imageId
        : null,
      selectedImageId: this.selectedImageId,
      slots: this.slots,
      step: currentStep
    });
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
        instructionText.textContent = `Bước 2: Chạm vào các bức ảnh bên trái để điền vào khung in (${filledSlots}/${maxSlots} ô)`;
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


};
