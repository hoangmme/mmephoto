import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=265';

export const StateMixin = {
_initSSE(branch) {
    this.branch = branch;
    this.rooms = {};
    this.activeRoom = null;
    this._staffEditingOverride = false; // Flag: Staff is editing steps 1-3, block server overwrites
    const branchNameEl = document.getElementById('headerBranchName');
    if (branchNameEl) {
      branchNameEl.textContent = `Chi nhánh: ${branch}`;
      branchNameEl.style.display = 'none';
    }

    // Fallback timer: Render default room after 1.5s if server fetch hangs
    const initFallbackTimeout = setTimeout(() => {
      if (!this.rooms || Object.keys(this.rooms).length === 0) {
        console.warn('Init state fetch timeout, rendering fallback Room1');
        this.rooms = { 'Room1': { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false } };
        this._renderTabs();
        if (this.activeRoom) this._updateUIForRoom();
      }
    }, 1500);

    // Immediate REST fetch for initial state (works even if SSE is buffered)
    fetch(`/api/init-state/${encodeURIComponent(branch)}`)
      .then(res => res.json())
      .then(data => {
        clearTimeout(initFallbackTimeout);
        if (data.success && data.rooms && data.rooms.length > 0) {
          data.rooms.forEach(r => {
            const room = r.room;
            if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
            this.rooms[room].queue = r.sessions || [];
            if (r.activeSessionId) this.rooms[room].activeSessionId = r.activeSessionId;
            this._updateActiveSession(room);
          });
        } else {
          if (!this.rooms || Object.keys(this.rooms).length === 0) {
            this.rooms = { 'Room1': { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false } };
          }
        }
        this._renderTabs();
        if (this.activeRoom) this._updateUIForRoom();
      }).catch(err => {
        clearTimeout(initFallbackTimeout);
        console.error('Init REST fetch error:', err);
        if (!this.rooms || Object.keys(this.rooms).length === 0) {
          this.rooms = { 'Room1': { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false } };
        }
        this._renderTabs();
        if (this.activeRoom) this._updateUIForRoom();
      });

    if (this.sse) this.sse.close();
    this.sse = new EventSource(`/api/stream/${branch}`);
    
    this.sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'init') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
        this.rooms[room].queue = data.sessions || [];
        if (data.activeSessionId) this.rooms[room].activeSessionId = data.activeSessionId;
        this._updateActiveSession(room);
        this._renderTabs();
        this._updateUIForRoom();
      } else if (data.type === 'active_session_changed') {
          if (this.rooms[data.room]) {
            this.rooms[data.room].activeSessionId = data.session;
            this._updateActiveSession(data.room);
            this._startStepTimer(data.room, this.rooms[data.room].step || 1);
            if (this.activeRoom === data.room) this._updateUIForRoom();
            if (this._renderQueueModal) this._renderQueueModal();
          }
        } else if (data.type === 'new_image') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
        if (data.imageUrl && data.imageUrl.includes('00_frame')) return;
        
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
            // Refresh timer start time while images are still uploading in Step 1 or 2
            if (sessionObj && (sessionObj.step || 1) <= 2) {
              sessionObj.sessionStartedAt = Date.now();
            }
            if (this.rooms[room].images.length === 0 && this.rooms[room].step === 1) {
              this._setStep(room, 1);
            }
            const newImg = { id: 'img_' + data.imageUrl.replace(/[^a-zA-Z0-9]/g, '_'), url: data.imageUrl, name: data.imageUrl.split('/').pop() };
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
      } else if (data.type === 'sync') {
        if (data.clientId === this.clientId) return; // Ignore our own sync echoes to prevent network races

        const room = data.room;
        if (this.rooms[room]) {
          // Find the session in the queue and update it
          let sessionObj = this.rooms[room].queue ? this.rooms[room].queue.find(s => s.id === data.session) : null;
          if (sessionObj) {
            if (data.step !== undefined) sessionObj.step = data.step;
            if (data.sessionStartedAt !== undefined) sessionObj.sessionStartedAt = data.sessionStartedAt;
            if (data.currentTemplate !== undefined) sessionObj.currentTemplate = data.currentTemplate;
            if (data.selectedTemplates !== undefined) sessionObj.selectedTemplates = data.selectedTemplates;
            if (data.paperSize !== undefined) sessionObj.paperSize = data.paperSize;
            if (data.canvasesState !== undefined) sessionObj.canvasesState = data.canvasesState;
            if (data.slots && data.slots.length > 0) {
              const serverHasImages = data.slots && data.slots.some(s => s && s.imageId);
              const localHasImages = sessionObj.slots && sessionObj.slots.some(s => s && s.imageId);
              if (serverHasImages || !localHasImages) {
                sessionObj.slots = data.slots;
              }
            }
            if (data.selectedImages) sessionObj.selectedImages = data.selectedImages;
          }

          // If this is the active session for this room
          if (this.rooms[room].session === data.session) {
            // Nếu là gói tin echo của chính máy mình vừa phát đi thì bỏ qua không đè dữ liệu vị trí cũ lại
            if (data.clientId && data.clientId === this.clientId) return;

            if (data.step !== undefined) {
              if (!isStaffMode) {
                // Do not allow sync events to downgrade the user from Step 4 (e.g., if Staff goes back to edit)
                if (this.rooms[room].step !== 4 || data.step === 4) {
                  this.rooms[room].step = data.step;
                  if (data.step < 4) {
                    this._startStepTimer(room, data.step);
                  }
                }
              } else {
                this.rooms[room].remoteStep = data.step;
              }
            }
            
            // Only update globals if this room is the currently viewed tab
            if (this.activeRoom === room) {
              // Staff editing override: block ALL server overwrites when Staff is editing steps 1-3
              let blockOverwrite = isStaffMode && this._staffEditingOverride;
              
              if (!isStaffMode && this.rooms[room].step === 4 && data.step !== undefined && data.step < 4) {
                // If User is currently viewing Step 4, ignore any incoming state syncs from Staff editing older steps
                blockOverwrite = true;
              }

              let templateChanged = false;
              const isUserStep1 = !isStaffMode && (this.rooms[room].step || 1) === 1;
              
              if (!blockOverwrite) {
                if (data.currentTemplate !== undefined && this.currentTemplate !== data.currentTemplate && !isUserStep1) {
                  this.currentTemplate = data.currentTemplate;
                  templateChanged = true;
                }
                if (data.selectedTemplates !== undefined && !isUserStep1) {
                  this.selectedTemplates = data.selectedTemplates;
                }
                if (data.paperSize !== undefined) {
                  this.paperSize = data.paperSize;
                }
                if (data.canvasesState !== undefined && !isUserStep1) {
                  this.canvasesState = data.canvasesState;
                  const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
                  if (this.canvasesState && this.canvasesState[activeIdx]) {
                    this.slots = this.canvasesState[activeIdx].slots || [];
                  }
                } else if (data.slots && data.slots.length > 0) {
                  const serverHasImages = data.slots && data.slots.some(s => s && s.imageId);
                  const localHasImages = this.slots && this.slots.some(s => s && s.imageId);
                  if (serverHasImages || !localHasImages) {
                    this.slots = data.slots;
                  }
                }
                if (data.selectedImages) this.selectedPhotos = new Set(data.selectedImages);
                
                if (templateChanged) {
                  this._loadTemplateImages();
                }
              }
              this._updateUIForRoom();
              this._renderCanvas();
            } else {
              this._renderTabs();
            }
          }
        }
      } else if (data.type === 'session_reopened') {
        const room = data.room;
        if (this.rooms[room]) {
          const sess = (this.rooms[room].queue || []).find(s => s.id === data.session);
          if (sess) {
            sess.finished = false;
            sess.step = 1;
          }
          this._updateActiveSession(room);
          if (this.activeRoom === room) {
            this._updateUIForRoom();
            if (this._renderQueueModal) this._renderQueueModal();
          }
          this._renderTabs();
        }
      } else if (data.type === 'session_finished') {
        const room = data.room;
        if (this.rooms[room]) {
           const sess = (this.rooms[room].queue || []).find(s => s.id === data.session);
           if (sess) {
             sess.finished = true;
             sess.step = 4;
           }
           if (data.activeSessionId !== undefined) {
             this.rooms[room].activeSessionId = data.activeSessionId;
           } else {
             const remaining = (this.rooms[room].queue || []).filter(s => !s.finished);
             this.rooms[room].activeSessionId = remaining.length > 0 ? remaining[0].id : null;
           }
           this._updateActiveSession(room);
           if (this.activeRoom === room) {
               this._updateUIForRoom();
               this._renderCanvas();
               if (this._renderQueueModal) this._renderQueueModal();
           }
           this._renderTabs();
        }
       } else if (data.type === 'session_reset') {
        const room = data.room;
        if (this.rooms[room]) {
          const roomData = this.rooms[room];
          roomData.session = data.session;
          roomData.activeSessionId = data.session;
          roomData.step = 1;
          roomData.locked = false;
          roomData.timeLeft = 420;
          if (roomData.timedOutSteps) roomData.timedOutSteps.clear();

          const sessObj = (roomData.queue || []).find(s => s.id === data.session);
          if (sessObj) {
            sessObj.finished = false;
            sessObj.step = 1;
            sessObj.sessionStartedAt = data.sessionStartedAt || Date.now();
          }

          this._updateActiveSession(room);
          this._startStepTimer(room, 1);
          if (this.activeRoom === room) {
            this._setStep(room, 1);
            this._updateUIForRoom();
            this._renderCanvas();
            if (this._renderQueueModal) this._renderQueueModal();
          }
          this._renderTabs();
        }
       } else if (data.type === 'session_deleted') {
        const room = data.room;
        if (this.rooms[room]) {
           this.rooms[room].queue = (this.rooms[room].queue || []).filter(s => s.id !== data.session);
           if (this.rooms[room].activeSessionId === data.session) {
               const remaining = this.rooms[room].queue.filter(s => !s.finished);
               this.rooms[room].activeSessionId = remaining.length > 0 ? remaining[0].id : null;
               this._updateActiveSession(room);
           }
           if (this.activeRoom === room) {
               this._updateUIForRoom();
               if (this._renderQueueModal) this._renderQueueModal();
           }
           this._renderTabs();
        }
      }
    };
  }
,

_updateActiveSession(room, onlyBadge = false) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    
    if (!roomData.queue) roomData.queue = [];
    
    let active = null;
    if (roomData.queue && roomData.queue.length > 0) {
      const unfinished = roomData.queue.filter(s => !s.finished);
      const activeSessionId = roomData.activeSessionId;
      active = roomData.queue.find(s => s.id === activeSessionId && !s.finished);
      if (!active && unfinished.length > 0) {
        active = unfinished[0];
        roomData.activeSessionId = active.id;
      }
    }

    if (active) {
      if (roomData.session !== active.id) {
        roomData.session = active.id;
        // User & Staff: always start at step 1.
        roomData.step = 1;
        this.currentStep = 1;
        if (this.activeRoom === room) {
          this.slots = [];
          this.selectedPhotos = new Set();
        }
      } else {
        if (roomData.step === undefined || roomData.step === null) {
          roomData.step = 1;
        } else {
          active.step = roomData.step;
        }
      }
    } else {
      roomData.session = null;
      roomData.activeSessionId = null;
      roomData.step = 1;
      this.currentStep = 1;
      this._staffEditingOverride = false;
      if (this.activeRoom === room) {
        this.slots = [];
        this.selectedPhotos = new Set();
        this.canvasesState = null;
      }
    }
      
      if (active) {
        if (active.sessionStartedAt) {
          const sessObj = roomData.queue ? roomData.queue.find(s => s.id === active.id) : null;
          if (sessObj) sessObj.sessionStartedAt = active.sessionStartedAt;
          roomData.sessionStarted = true;
        } else {
          roomData.sessionStarted = false;
        }
        roomData.timerStarted = true;
        if (!isStaffMode && roomData.sessionStarted && !roomData.timerInterval && (roomData.step || 1) < 4) {
          this._startStepTimer(room, roomData.step || 1);
        }
      } else {
        roomData.timerStarted = false;
        roomData.sessionStarted = false;
      }
      
      if (!onlyBadge && active) {
        if (this.activeRoom === room) {
          // Staff editing override: when Staff is editing steps 1-3, do NOT load template/slots from active session
          const isUserStep1 = !isStaffMode && (roomData.step || 1) === 1;
          const hasLocalSlots = this.slots && this.slots.length > 0 && this.slots.some(s => s && s.imageId);

          if (isStaffMode) {
            // Staff Mode: If local slots are empty or Staff navigated back to edit steps, load customer session data
            if (!hasLocalSlots && active) {
              if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
                this.currentTemplate = active.currentTemplate;
              }
              if (active.selectedTemplates && active.selectedTemplates.length > 0) {
                this.selectedTemplates = active.selectedTemplates;
              }
              if (active.paperSize) {
                this.paperSize = active.paperSize;
              }
              if (active.canvasesState && active.canvasesState.length > 0) {
                this.canvasesState = JSON.parse(JSON.stringify(active.canvasesState));
              }
              if (active.slots && active.slots.length > 0) {
                this.slots = JSON.parse(JSON.stringify(active.slots));
              } else {
                const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
                if (this.canvasesState && this.canvasesState[activeIdx] && this.canvasesState[activeIdx].slots) {
                  this.slots = JSON.parse(JSON.stringify(this.canvasesState[activeIdx].slots));
                }
              }
              if (active.selectedImages) {
                this.selectedPhotos = new Set(active.selectedImages);
              }
            }
          } else if (!isUserStep1) {
            if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
              this.currentTemplate = active.currentTemplate;
            }
            if (active.selectedTemplates && active.selectedTemplates.length > 0) {
              this.selectedTemplates = active.selectedTemplates;
            }
            if (active.paperSize) {
              this.paperSize = active.paperSize;
            }
            if (active.canvasesState && active.canvasesState.length > 0) {
              this.canvasesState = JSON.parse(JSON.stringify(active.canvasesState));
            }
          } else {
            // Màn Khách: Chỉ nạp slots từ Server nếu local hoàn toàn rỗng hoặc chưa chọn ảnh nào
            const localHasImages = this.slots && this.slots.some(s => s && s.imageId);
            if (!localHasImages) {
              if (active.slots && active.slots.length > 0 && active.slots.some(s => s && s.imageId)) {
                this.slots = JSON.parse(JSON.stringify(active.slots));
              }
            }

            if (!this.selectedPhotos || this.selectedPhotos.size === 0) {
              if (active.selectedImages && active.selectedImages.length > 0) {
                this.selectedPhotos = new Set(active.selectedImages);
              }
            }
          }
        }
        
        const uniqueUrls = Array.from(new Set(active.images || []))
          .filter(url => url && !url.includes('00_frame'));
        
        roomData.images = uniqueUrls.map(url => {
          const id = 'img_' + url.replace(/[^a-zA-Z0-9]/g, '_');
          this._preloadImage(id, url).then(() => {
            if (this.activeRoom === room) this._renderCanvas();
          });
          return { id, url, name: url.split('/').pop() };
        });
        
        if (this.activeRoom === room) {
          if (this.currentTemplate) {
            this._loadTemplateImages();
          }
        }
        

    } else if (!onlyBadge && !active) {
      roomData.session = null;
      roomData.images = [];
      roomData.step = 1;
      roomData.timerStarted = false;
      if (this.selectedPhotos) this.selectedPhotos.clear();
      this._stopTimer(room);
    }
    
    // Update Header
    if (this.activeRoom === room) {
       const lbl = document.getElementById('headerSessionName');
       if (lbl) {
          if (roomData.session) {
            const imgCount = roomData.images ? roomData.images.length : 0;
            lbl.textContent = `Phiên: ${roomData.session} (${imgCount} ảnh)`;
            lbl.style.display = 'inline-flex';
            lbl.style.alignItems = 'center';
          } else {
            lbl.style.display = 'none';
          }
       }
    }
  }
,

async _syncStateDirect(room) {
    const roomData = this.rooms[room];
    if (!roomData || !this.branch || !roomData.session) return;

    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    if (activeSess) {
      activeSess.step = roomData.step;
    }

    try {
      const payload = {
        clientId: this.clientId,
        step: roomData.step
      };

      if (activeSess) {
        payload.currentTemplate = activeSess.currentTemplate || '1photo';
        payload.selectedTemplates = activeSess.selectedTemplates || ['1photo'];
        payload.paperSize = activeSess.paperSize || 'A4';
        payload.canvasesState = activeSess.canvasesState || [];
        payload.selectedImages = activeSess.selectedImages || [];
        payload.slots = activeSess.slots || [];
        if (activeSess.sessionStartedAt) {
          payload.sessionStartedAt = activeSess.sessionStartedAt;
        }
      }

      const res = await fetch(`/api/sync-state/${encodeURIComponent(this.branch)}/${encodeURIComponent(room)}/${encodeURIComponent(roomData.session)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`Sync-state endpoint returned ${res.status}:`, text);
        return null;
      }
      const data = await res.json();
      if (data && data.sessionStartedAt && activeSess) {
        activeSess.sessionStartedAt = data.sessionStartedAt;
      }
      return data;
    } catch (err) {
      console.error('Direct sync error:', err);
    }
  }
,

_syncState(room) {
    const roomData = this.rooms[room];
    if (!roomData || !this.branch || !roomData.session) return;
    
    if (this._syncTimers === undefined) this._syncTimers = {};
    if (this._syncTimers[room]) clearTimeout(this._syncTimers[room]);

    this._syncTimers[room] = setTimeout(() => {
      this._syncStateDirect(room);
    }, 150);
  }
,

_startStepTimer(room, step) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    if (roomData.timerInterval) clearInterval(roomData.timerInterval);
    
    roomData.step = step;
    roomData.locked = false;
    roomData.timerStarted = true;
    if (!roomData.timedOutSteps) roomData.timedOutSteps = new Set();
    
    // Disable timer countdown in Staff Mode completely
    if (isStaffMode) {
      if (this.activeRoom === room) this._updateUIForRoom();
      return;
    }

    let duration = 420; // 7 minutes
    if (step === 4) {
      roomData.timeLeft = 0;
      if (this.activeRoom === room) this._updateUIForRoom();
      return;
    }

    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    const updateTimeLeft = () => {
      if (activeSess && activeSess.sessionStartedAt) {
        const elapsed = Math.floor((Date.now() - activeSess.sessionStartedAt) / 1000);
        roomData.timeLeft = Math.max(0, duration - elapsed);
      } else {
        roomData.timeLeft = duration;
      }
    };

    updateTimeLeft();

    roomData.timerInterval = setInterval(() => {
      updateTimeLeft();

      if (roomData.timeLeft <= 0) {
        roomData.timeLeft = 0;
        roomData.timedOutSteps.add(step);
        clearInterval(roomData.timerInterval);

        if (!isStaffMode) {
          if (step !== 4) {
            // Auto fill remaining slots if any
            if (this._autoFill) this._autoFill();
            // Try to upload whatever frame they have
            if (this._uploadFinalFrame) this._uploadFinalFrame();
            this._setStep(room, 4);
          }
        }
      }

      if (this.activeRoom === room) {
        if (this._updateTimerUI) this._updateTimerUI();
        else this._updateUIForRoom();
      }
    }, 1000);
  }
,

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
,

_stopTimer(room) {
    if (this.rooms[room] && this.rooms[room].timerInterval) {
      clearInterval(this.rooms[room].timerInterval);
      this.rooms[room].timerInterval = null;
    }
  }
,

  _updateQRCode(room, session) {
    const qrOverlay = document.getElementById('qrOverlay');
    if (!qrOverlay) return;
    qrOverlay.style.cursor = 'default';
    
    const img = document.getElementById('qrImage');
    const b = localStorage.getItem('branchId') || '';
    const url = `${window.location.origin}/download.html?branch=${b}&room=${room}&session=${session}`;
    
    const qrLink = document.getElementById('qrLink');
    if (qrLink) qrLink.href = url;

    if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=${encodeURIComponent(url)}`;
      img.style.cursor = 'default';
      img.onclick = null;
    }

    qrOverlay.onclick = null;
  }
,

};
