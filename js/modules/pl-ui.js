import { ALL_TEMPLATES, customTemplates, isStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

export const UIMixin = {
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
        localStorage.setItem('branchPass', pass);
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
,

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
    this.canvas = document.getElementById('printCanvas') || this.canvas;
    
    this._initMainSwiper();
    this._bindEvents();
    this._initTemplate();
    this._loadBatch();
    this._initLogin();
    if (this._initQueueManager) this._initQueueManager();
  }
,

_initMainSwiper() {
    if (!this.mainSwiper) return;
    this.mainSwiper.innerHTML = '';
    
    Object.keys(ALL_TEMPLATES).forEach(k => {
      const t = ALL_TEMPLATES[k];
      const slide = document.createElement('div');
      slide.className = 'pl-slide';
      slide.dataset.id = k;
      
      if (k === this.currentTemplate) {
        slide.classList.add('active');
      }
      
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
,

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
        btn.style.color = '#fff';
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
,

_updateUIForRoom() {
    this._updateActiveSession(this.activeRoom, true);
    
    // SAFEGUARD: If step is 4, but we have NO images in slots, we must be missing data. Revert to step 1.
    if (this.activeRoom && this.rooms[this.activeRoom] && this.rooms[this.activeRoom].step === 4) {
      if (!this.slots || !this.slots.some(s => s.imageId)) {
        console.warn("Safeguard triggered: step 4 but no slots filled! Reverting to step 1.");
        this.rooms[this.activeRoom].step = 1;
      }
    }

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
    if (this.imageCount) this.imageCount.textContent = `${this.images.length} ảnh`;
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

    // Sync swiper to current template without triggering slideChange
    if (this.swiper && this.currentTemplate) {
      const slides = Array.from(this.swiper.slides);
      const index = slides.findIndex(s => s.dataset.id === this.currentTemplate);
      if (index !== -1 && index !== this.swiper.activeIndex) {
        this.swiper.slideTo(index, 0, false);
      }
    }

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

    // Instruction text & buttons based on step
    if (instructionText && btnStepPrev && btnStepNext) {
      
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
        const filledSlots = this.selectedPhotos ? this.selectedPhotos.size : 0;
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
        btnStepNext.innerHTML = isStaffMode ? '✅ Hoàn Tất (Gửi cho User)' : '✅ Hoàn Tất (Gửi cho Nhân Viên)';
        if (btnNext) btnNext.style.display = 'none';
        if (qrOverlay) qrOverlay.style.display = 'none';
      } else if (step === 4) {
        instructionText.textContent = isStaffMode ? '✨ Vui lòng kiểm tra lại bố cục, tải ảnh layout và nhận khách tiếp theo.' : '✨ Xin chúc mừng bạn đã hoàn thành, xin vui lòng đợi nhân viên kiểm tra và in ảnh nhé';
        
        // Force display block for swiper area and canvas
        const swiperArea = document.getElementById('mainSwiperArea');
        if (swiperArea) swiperArea.style.display = 'block';
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.opacity = '1';
            setTimeout(() => this._renderCanvas(), 500); // force draw after 500ms
        }

        btnStepPrev.style.display = isStaffMode ? 'inline-flex' : 'none';
        btnStepNext.style.display = 'none';
        
        const btnStaffDownload = document.getElementById('btnStaffDownload');
        if (btnStaffDownload) btnStaffDownload.style.display = isStaffMode ? 'inline-flex' : 'none';
        
        if (btnNext) btnNext.style.display = isStaffMode ? 'inline-flex' : 'none';
        if (qrOverlay) qrOverlay.style.display = isStaffMode ? 'none' : 'block';
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
,

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
    this._syncState(room);
  }
,

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
,

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
    
    const btnStaffDownload = document.getElementById('btnStaffDownload');
    if (btnStaffDownload) btnStaffDownload.addEventListener('click', () => this._exportJPG());
    
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
          if (this.selectedPhotos.size !== this.slots.length) {
            alert(`Vui lòng chọn đúng ${this.slots.length} ảnh trước khi tiếp tục!`);
            return;
          }
          if (this.selectedPhotos.size > 0) {
            // Clear existing slots first
            this.slots.forEach(s => s.imageId = null);
            let imgIndex = 0;
            const selectedArr = Array.from(this.selectedPhotos);
            for (let i = 0; i < this.slots.length; i++) {
              if (imgIndex < selectedArr.length) {
                this._assignToSlot(i, selectedArr[imgIndex], true); // true = skipSync
                imgIndex++;
              }
            }
          } else {
            if (this._autoFill) this._autoFill(true);
          }
          this._setStep(this.activeRoom, 3);
        } else if (cur === 3) {
          this._uploadFinalFrame();
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
          const roomData = this.rooms[this.activeRoom];
          // Block navigating back if already completed (unless staff)
          if (roomData.step === 4 && !isStaffMode) return;

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
      if (isDragging) {
        this._syncState(this.activeRoom);
      }
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

    this.canvas.addEventListener('touchend', () => {
      if (this.selectedSlotIndex >= 0) {
        this._syncState(this.activeRoom);
      }
    });

    // Mouse wheel zoom support for desktop testing/usage
    this.canvas.addEventListener('wheel', (e) => {
      const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
      if (step === 1 || step === 4) return;
      if (this.selectedSlotIndex < 0) return;
      const slot = this.slots[this.selectedSlotIndex];
      if (!slot || !slot.imageId) return;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this._zoomSlot(this.selectedSlotIndex, Math.max(0.3, Math.min(4.0, (slot.zoom || 1.0) + delta)));
      
      // Debounce wheel sync
      clearTimeout(this._wheelSyncTimer);
      this._wheelSyncTimer = setTimeout(() => this._syncState(this.activeRoom), 200);
      
      e.preventDefault();
    }, { passive: false });
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

    // Auto-fill slots automatically for better UX
    setTimeout(() => {
       this._autoFill();
       this._renderCanvas();
    }, 50);
  }

  // ── Render Image List ──
,

_renderImageList() {
    this.imageList.innerHTML = '';
    const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));
    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;

    let imagesToRender = this.images;
    if (step === 3 && this.selectedPhotos.size > 0) {
      imagesToRender = this.images.filter(img => this.selectedPhotos.has(img.id));
    }

    imagesToRender.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      thumb.dataset.id = img.id;

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
            const template = ALL_TEMPLATES[this.currentTemplate];
            const maxSlots = template ? template.slots.length : 0;
            if (maxSlots > 0 && this.selectedPhotos.size >= maxSlots) {
              alert(`Bạn chỉ được chọn tối đa ${maxSlots} ảnh cho khung này.`);
              return;
            }
            this.selectedPhotos.add(img.id);
          }
          this._updateImageListUI();
          this._updateUIForRoom();
          this._syncState(this.activeRoom);
        } else {
          this.selectedImageId = img.id;
          this._updateImageListUI();
          // If a slot is selected, assign image to it
          if (this.selectedSlotIndex >= 0) {
            this._assignToSlot(this.selectedSlotIndex, img.id);
          }
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
        if (imgId === this.selectedImageId) thumb.classList.add('selected');
        if (usedIds.has(imgId)) thumb.classList.add('used');
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
,

};
