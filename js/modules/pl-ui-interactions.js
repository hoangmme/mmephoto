import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=287';
import { TemplatePicker } from '../components/TemplatePicker.js?v=287';
import { LightboxComponent } from '../components/LightboxComponent.js?v=287';
import { HeaderActions } from '../components/HeaderActions.js?v=287';
import { CrossSellBanner } from '../components/CrossSellBanner.js?v=287';
import { RoomTabsComponent } from '../components/RoomTabsComponent.js?v=287';
import { QueueModalComponent } from '../components/QueueModalComponent.js?v=287';
import { StepBannerComponent } from '../components/StepBannerComponent.js?v=287';
import { ImageListUI } from '../components/ImageListUI.js?v=287';

export const UIInteractionsMixin = {
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
        if (roomData && roomData.session) {
          const lockOverlay = document.getElementById('lockOverlay');
          if (lockOverlay) lockOverlay.style.display = 'none';
          this._resetSessionTimer(roomData.session);
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
        if (cur === 4 && !isStaffMode) return; // Locked at step 4
        if (cur > 1) {
          this._setStep(this.activeRoom, cur - 1);
        }
      });
    }

    const btnStepNext = document.getElementById('btnStepNext');
    if (btnStepNext) {
      btnStepNext.addEventListener('click', async () => {
        if (!this.activeRoom || !this.rooms[this.activeRoom]) return;
        const cur = (isStaffMode && this.currentStep) ? this.currentStep : (this.rooms[this.activeRoom].step || 1);
        if (cur === 1) {
          
          // Layout Selector Confirmation
          if (this.selectedLayoutOption === 1) {
            this.paperSize = 'A4';
            this.selectedTemplates = [this.selectedLayoutTemplates.a4];
          } else {
            this.paperSize = 'A5';
            this.selectedTemplates = [this.selectedLayoutTemplates.a5_top, this.selectedLayoutTemplates.a5_bottom];
          }
          this.currentTemplate = this.selectedTemplates[0];

          this.canvasesState = this.selectedTemplates.map(t => {
            const tmpl = window.ALL_TEMPLATES[t];
            const numSlots = tmpl && tmpl.slots ? tmpl.slots.length : 0;
            return {
              templateId: t,
              slots: Array(numSlots).fill(null).map((_, i) => {
                const sDef = tmpl && tmpl.slots ? tmpl.slots[i] : null;
                return { imageId: null, zoom: 1.0, panX: 0, panY: 0, rotation: sDef ? (sDef.defaultRotation !== undefined ? sDef.defaultRotation : (sDef.rotation || 0)) : 0 };
              }),
              selectedSlotIndex: -1
            };
          });
          this.activeCanvasIndex = 0;
          this.slots = [];
          this.selectedPhotos.clear();

          if (this._syncStaffDraftState) this._syncStaffDraftState();
          this._loadTemplateImages();

          // Reset 7-minute timer start time when user proceeds to Step 2 ("Chọn Ảnh")
          const roomD = this.rooms[this.activeRoom];
          const activeSess = roomD && roomD.queue ? roomD.queue.find(s => s.id === roomD.session) : null;
          if (activeSess) {
            activeSess.sessionStartedAt = Date.now();
          }

          this._setStep(this.activeRoom, 2);
          this._updateUIForRoom();
          this._renderCanvas();

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
        } else if (cur === 3 || (isStaffMode && cur < 4)) {
          const roomData = this.rooms[this.activeRoom];
          if (roomData) {
            roomData.step = 4;
            this._staffEditingOverride = false; // Staff finishes editing, commit changes to official session component
            this._commitDraftToOfficialSession(this.activeRoom);
          }
          // Refresh local canvasesState/slots from activeSess AFTER commitDraft so uploadFinalFrame renders the correct data
          if (roomData && roomData.queue && roomData.session) {
            const activeSess = roomData.queue.find(s => s.id === roomData.session);
            if (activeSess) {
              if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
                this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
              }
              if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
                this.selectedTemplates = [...activeSess.selectedTemplates];
              }
              if (activeSess.paperSize) this.paperSize = activeSess.paperSize;
            }
          }
          if (this._syncStateDirect) {
            await this._syncStateDirect(this.activeRoom);
          } else {
            this._syncState(this.activeRoom);
          }
          await this._uploadFinalFrame();
          this._setStep(this.activeRoom, 4, false);
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
    const bindCanvasEvents = (canvasEl, cIdx) => {
      if (!canvasEl) return;

      let isDragging = false, isRotatingSlot = false;
      let dragStartX, dragStartY, dragSlot;
      let rotateStartAngle = 0, initialSlotRot = 0, touchRotateStartTime = 0;


      const setActive = () => {
        this.activeCanvasIndex = cIdx;
        this.canvas = canvasEl;
        this.currentTemplate = (this.selectedTemplates && this.selectedTemplates[cIdx]) ? this.selectedTemplates[cIdx] : this.currentTemplate;
        if (this.canvasesState && this.canvasesState[cIdx]) {
          if (!this.canvasesState[cIdx].slots) this.canvasesState[cIdx].slots = [];
          this.slots = this.canvasesState[cIdx].slots;
          if (this.canvasesState[cIdx].selectedSlotIndex !== undefined) {
            this.selectedSlotIndex = this.canvasesState[cIdx].selectedSlotIndex;
          }
        }
        if (this._syncStaffDraftState) this._syncStaffDraftState();
      };

      const labelEl = document.getElementById('canvasLabel' + cIdx);
      if (labelEl) {
        labelEl.onclick = () => {
          setActive();
          this._renderCanvas();
          this._updateImageListUI();
        };
      }

      const wrapperBox = document.getElementById('canvasWrapper' + cIdx);
      if (wrapperBox) {
        wrapperBox.onclick = (e) => {
          if (e.target.tagName !== 'CANVAS') {
            setActive();
            this._renderCanvas();
            this._updateImageListUI();
          }
        };
      }



      // Canvas click & touch tap → select slot
      let slotClickHandled = false;
      const handleCanvasSlotClick = (e) => {
        if (slotClickHandled) return;
        slotClickHandled = true;
        setTimeout(() => { slotClickHandled = false; }, 250);
        setActive();
        this._onCanvasClick(e);
      };

      let activePointers = new Set();
      let lastTapTime = 0;
      
      canvasEl.addEventListener('pointerdown', (e) => {
        activePointers.add(e.pointerId);
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          // Bỏ qua chọn slot nếu đang chạm 2 ngón tay (để zoom)
          if (activePointers.size > 1) return;
          
          const roomData = this.activeRoom && this.rooms && this.rooms[this.activeRoom];
          const step = roomData ? (roomData.step || 3) : (this.currentStep || 3);
          
          if (step === 3) {
            // Bước 3: Yêu cầu chạm 2 lần (Double Tap) để đổi slot
            const now = Date.now();
            if (now - lastTapTime < 400) {
              handleCanvasSlotClick(e);
              lastTapTime = 0;
            } else {
              lastTapTime = now;
            }
          } else {
            // Bước 2: Chạm 1 lần bình thường
            handleCanvasSlotClick(e);
          }
        }
      });
      
      canvasEl.addEventListener('pointerup', (e) => activePointers.delete(e.pointerId));
      canvasEl.addEventListener('pointercancel', (e) => activePointers.delete(e.pointerId));
      canvasEl.addEventListener('pointerout', (e) => activePointers.delete(e.pointerId));
      
      canvasEl.addEventListener('click', (e) => {
        const roomData = this.activeRoom && this.rooms && this.rooms[this.activeRoom];
        const step = roomData ? (roomData.step || 3) : (this.currentStep || 3);
        if (step !== 3) handleCanvasSlotClick(e);
      });
      
      canvasEl.addEventListener('dblclick', (e) => {
        const roomData = this.activeRoom && this.rooms && this.rooms[this.activeRoom];
        const step = roomData ? (roomData.step || 3) : (this.currentStep || 3);
        if (step === 3) handleCanvasSlotClick(e);
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
          const handleOffsetY = handleSign * (halfH + 100);

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

          if (distHandle <= 200) {
            isRotatingSlot = true;
            touchRotateStartTime = Date.now();
            rotateStartAngle = Math.atan2(y - (slotDef.cy + (slot.panY || 0)), x - (slotDef.cx + (slot.panX || 0))) * (180 / Math.PI);
            initialSlotRot = slot.rotation || 0;
            this.canvas.style.cursor = 'grab';
            return;
          }
        }

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragSlot = this.selectedSlotIndex;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      const curStep = (this.activeRoom && this.rooms && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || this.currentStep || 1) : (this.currentStep || 1);
      if (curStep === 4) { isDragging = false; isRotatingSlot = false; return; }
      if (!isRotatingSlot && !isDragging) return;
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
          if (this._syncStaffDraftState) this._syncStaffDraftState();
        }
        return;
      }

      if (!isDragging) return;
      const scale = this.canvas.width / this.canvas.offsetWidth;
      const dx = (e.clientX - dragStartX) * scale;
      const dy = (e.clientY - dragStartY) * scale;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
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
            if (this._syncStaffDraftState) this._syncStaffDraftState();
          }
        }
      }
      isDragging = false;
      isRotatingSlot = false;
      this.canvas.style.cursor = '';
    };

    window.addEventListener('mouseup', endMouseDrag);

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
          const handleOffsetY = handleSign * (halfH + 100);

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

          if (distHandle <= 220) {
            isRotatingSlot = true;
            touchRotateStartTime = Date.now();
            rotateStartAngle = Math.atan2(y - (slotDef.cy + (slot.panY || 0)), x - (slotDef.cx + (slot.panX || 0))) * (180 / Math.PI);
            initialSlotRot = slot.rotation || 0;
            e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
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
      const curStep = (this.activeRoom && this.rooms && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || this.currentStep || 1) : (this.currentStep || 1);
      if (curStep === 4) return;
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
        if (this._syncStaffDraftState) this._syncStaffDraftState();
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
        if (this._syncStaffDraftState) this._syncStaffDraftState();
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
            if (this._syncStaffDraftState) this._syncStaffDraftState();
          }
        }
      }
      isRotatingSlot = false;
    });

    // Mouse wheel zoom support for desktop testing/usage
    canvasEl.addEventListener('wheel', (e) => {
      const curStep = (this.activeRoom && this.rooms && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || this.currentStep || 1) : (this.currentStep || 1);
      if (curStep === 4) return;
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


  _updateHeaderActions() {
    if (!this._headerActions) {
      this._headerActions = new HeaderActions({
        onRotate: (cIdx) => {
          this.activeCanvasIndex = cIdx;
          this._rotateActiveSlot(90, cIdx);
        },
        onReset: (cIdx) => {
          this.activeCanvasIndex = cIdx;
          this._resetActiveSlotRotation(cIdx);
        }
      });
    }
    const currentStep = (isStaffMode && this.currentStep)
      ? this.currentStep
      : ((this.activeRoom && this.rooms && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1);

    this._headerActions.updateVisibility(currentStep, this.activeCanvasIndex, this.canvasesState, this.selectedSlotIndex);
  }

  // ── Canvas Click → Select Slot ──
  ,


  _rotateActiveSlot(degrees, cIdx) {
    if (this.canvasesState && this.canvasesState[cIdx]) {
      const stateSel = this.canvasesState[cIdx].selectedSlotIndex;
      if (stateSel >= 0 && this.canvasesState[cIdx].slots[stateSel]) {
        this.canvasesState[cIdx].slots[stateSel].rotation = (this.canvasesState[cIdx].slots[stateSel].rotation + degrees) % 360;
        if (this._syncStaffDraftState) this._syncStaffDraftState();
        if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
      }
    }
  },


  _resetActiveSlotRotation(cIdx) {
    if (this.canvasesState && this.canvasesState[cIdx]) {
      const stateSel = this.canvasesState[cIdx].selectedSlotIndex;
      if (stateSel >= 0 && this.canvasesState[cIdx].slots[stateSel]) {
        this.canvasesState[cIdx].slots[stateSel].rotation = 0;
        this.canvasesState[cIdx].slots[stateSel].panX = 0;
        this.canvasesState[cIdx].slots[stateSel].panY = 0;
        this.canvasesState[cIdx].slots[stateSel].zoom = 1.0;
        if (this._syncStaffDraftState) this._syncStaffDraftState();
        if (this._requestRenderCanvas) this._requestRenderCanvas(); else this._renderCanvas();
      }
    }
  },


};
