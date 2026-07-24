import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

export const StateMixin = {
_initSSE(branch) {
    this.branch = branch;
    this.rooms = {};
    this.activeRoom = null;
    const branchNameEl = document.getElementById('headerBranchName');
    if (branchNameEl) {
      branchNameEl.textContent = `Chi nhánh: ${branch}`;
      branchNameEl.style.display = 'inline';
    }

    // Immediate REST fetch for initial state (works even if SSE is buffered)
    fetch(`/api/init-state/${encodeURIComponent(branch)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rooms) {
          data.rooms.forEach(r => {
            const room = r.room;
            if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 60, locked: false, hasNew: false, queue: [], step: 1, lastImageTime: null, timerStarted: false };
            this.rooms[room].queue = r.sessions || [];
            if (r.activeSessionId) this.rooms[room].activeSessionId = r.activeSessionId;
            this._updateActiveSession(room);
          });
          this._renderTabs();
          if (this.activeRoom) this._updateUIForRoom();
        }
      }).catch(err => console.error('Init REST fetch error:', err));

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
        if (data.imageUrl && data.imageUrl.includes('00_frame.jpg')) return;
        
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
        const room = data.room;
        if (this.rooms[room]) {
          // Find the session in the queue and update it
          let sessionObj = this.rooms[room].queue ? this.rooms[room].queue.find(s => s.id === data.session) : null;
          if (sessionObj) {
            if (data.step !== undefined) sessionObj.step = data.step;
            if (data.stepStartedAt !== undefined) sessionObj.stepStartedAt = data.stepStartedAt;
            if (data.currentTemplate !== undefined) sessionObj.currentTemplate = data.currentTemplate;
            if (data.slots && data.slots.length > 0) sessionObj.slots = data.slots;
            if (data.selectedImages) sessionObj.selectedImages = data.selectedImages;
          }

          // If this is the active session for this room
          if (this.rooms[room].session === data.session) {
            if (data.step !== undefined) {
              this.rooms[room].step = data.step;
              if (!isStaffMode && data.step < 4) {
                this._startStepTimer(room, data.step);
              }
            }
            
            // Only update globals if this room is the currently viewed tab
            if (this.activeRoom === room) {
              let templateChanged = false;
              if (data.currentTemplate !== undefined && this.currentTemplate !== data.currentTemplate) {
                this.currentTemplate = data.currentTemplate;
                templateChanged = true;
              }
              if (data.slots && data.slots.length > 0) this.slots = data.slots;
              if (data.selectedImages) this.selectedPhotos = new Set(data.selectedImages);
              
              if (templateChanged) {
                this._loadTemplateImages();
                this._updateUIForRoom();
                this._renderCanvas();
              }
            }
          }
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
    
    if (roomData.queue && roomData.queue.length > 0) {
      const unfinished = roomData.queue.filter(s => !s.finished);
      const activeSessionId = roomData.activeSessionId;
      let active = roomData.queue.find(s => s.id === activeSessionId && !s.finished);
      if (!active && unfinished.length > 0) {
        active = unfinished[0];
        roomData.activeSessionId = active.id;
      }
      
      if (active) {
        if (roomData.session !== active.id) {
          roomData.session = active.id;
          roomData.step = active.step || 1;
        } else {
          if (roomData.step === undefined || roomData.step === null) {
            roomData.step = active.step || 1;
          } else {
            active.step = roomData.step;
          }
        }
      } else {
        roomData.session = null;
        roomData.step = 1;
        if (this.activeRoom === room) {
          this.slots = [];
          this.selectedPhotos = new Set();
        }
      }
      
      if (active) {
        if (active.stepStartedAt) {
          const sessObj = roomData.queue ? roomData.queue.find(s => s.id === active.id) : null;
          if (sessObj) sessObj.stepStartedAt = active.stepStartedAt;
        }
        roomData.timerStarted = true;
        if (!isStaffMode && !roomData.timerInterval && (roomData.step || 1) < 4) {
          this._startStepTimer(room, roomData.step || 1);
        }
      } else {
        roomData.timerStarted = false;
      }
      roomData.lastImageTime = Date.now();
      
      if (!onlyBadge && active) {
        if (this.activeRoom === room) {
          if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
            this.currentTemplate = active.currentTemplate;
          } else if (this.currentTemplate && ALL_TEMPLATES[this.currentTemplate]) {
            active.currentTemplate = this.currentTemplate;
          } else {
            this.currentTemplate = Object.keys(ALL_TEMPLATES)[0];
            active.currentTemplate = this.currentTemplate;
          }

          if (active.slots && active.slots.length > 0) {
            this.slots = JSON.parse(JSON.stringify(active.slots));
          } else {
            const t = ALL_TEMPLATES[this.currentTemplate] || Object.values(ALL_TEMPLATES)[0];
            if (t && t.slots) {
              this.slots = t.slots.map(s => ({ ...s, imageId: null, scale: 1, rotate: 0, x: 0, y: 0 }));
            } else {
              this.slots = [];
            }
          }

          if (active.selectedImages) {
            this.selectedPhotos = new Set(active.selectedImages);
          } else {
            this.selectedPhotos.clear();
          }
        }
        
        roomData.images = (active.images || [])
          .filter(url => !url.includes('00_frame.jpg'))
          .map(url => {
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
        
        // Only set step to 1 if we don't have a saved step from server AND smart recovery didn't bump the step
        if (roomData.images.length > 0 && !active.step && roomData.step === 1) {
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

_syncState(room) {
    const roomData = this.rooms[room];
    if (!roomData || !this.branch || !roomData.session) return;
    
    fetch(`/api/sync-state/${encodeURIComponent(this.branch)}/${encodeURIComponent(room)}/${encodeURIComponent(roomData.session)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: roomData.step,
        currentTemplate: this.currentTemplate,
        selectedImages: Array.from(this.selectedPhotos || []),
        slots: this.slots || []
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.stepStartedAt) {
        const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
        if (activeSess) {
          activeSess.stepStartedAt = data.stepStartedAt;
          if (!isStaffMode && (roomData.step || 1) < 4) {
            this._startStepTimer(room, roomData.step || 1);
          }
        }
      }
    })
    .catch(err => console.error('Sync error:', err));
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

    let duration = 60;
    if (step === 1) duration = 60;
    else if (step === 2) duration = 180;
    else if (step === 3) duration = 180;
    else {
      roomData.timeLeft = 0;
      if (this.activeRoom === room) this._updateUIForRoom();
      return;
    }

    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    const updateTimeLeft = () => {
      if (activeSess && activeSess.stepStartedAt) {
        const elapsed = Math.floor((Date.now() - activeSess.stepStartedAt) / 1000);
        roomData.timeLeft = Math.max(0, duration - elapsed);
      } else {
        if (roomData.timeLeft === undefined || roomData.timeLeft > duration) {
          roomData.timeLeft = duration;
        } else {
          roomData.timeLeft--;
        }
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
          if (step === 1) {
            this._setStep(room, 2);
          } else if (step === 2) {
            if (this._autoFill) this._autoFill();
            this._setStep(room, 3);
          } else if (step === 3) {
            this._uploadFinalFrame();
            this._setStep(room, 4);
          }
        }
      }

      if (this.activeRoom === room) {
        this._updateUIForRoom();
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
,

};
