import { ALL_TEMPLATES, customTemplates, isStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

export const StateMixin = {
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
        if (data.activeSessionId) this.rooms[room].activeSessionId = data.activeSessionId;
        this._renderTabs();
        this._updateActiveSession(room);
        this._updateUIForRoom();
      } else if (data.type === 'active_session_changed') {
          if (this.rooms[data.room]) {
            this.rooms[data.room].activeSessionId = data.session;
            this._updateActiveSession(data.room);
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
            if (this.rooms[room].images.length === 0) {
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
            if (data.currentTemplate !== undefined) sessionObj.currentTemplate = data.currentTemplate;
            if (data.slots && data.slots.length > 0) sessionObj.slots = data.slots;
            if (data.selectedImages) sessionObj.selectedImages = data.selectedImages;
          }

          // If this is the active session for this room
          if (this.rooms[room].session === data.session) {
            if (data.step !== undefined) this.rooms[room].step = data.step;
            
            // Only update globals if this room is the currently viewed tab
            if (this.activeRoom === room) {
              let templateChanged = false;
              if (data.currentTemplate !== undefined && this.currentTemplate !== data.currentTemplate) {
                this.currentTemplate = data.currentTemplate;
                templateChanged = true;
              }
              if (data.slots && data.slots.length > 0) this.slots = data.slots;
              if (data.selectedImages) this.selectedPhotos = new Set(data.selectedImages);
              
              if (templateChanged) this._loadTemplateImages();
              this._updateUIForRoom();
              this._renderCanvas();
              this._renderTabs();
            }
          }
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
,

_updateActiveSession(room, onlyBadge = false) {
    const roomData = this.rooms[room];
    if (!roomData) return;
    
    if (!roomData.queue) roomData.queue = [];
    
    if (roomData.queue && roomData.queue.length > 0) {
      const activeSessionId = roomData.activeSessionId;
      const active = roomData.queue.find(s => s.id === activeSessionId) || roomData.queue[0];
      if (roomData.session !== active.id && !onlyBadge) {
        roomData.session = active.id;
        roomData.step = active.step || 1;
        
        // Smart step recovery based on data integrity:
        // If we have selected images, we must be at least at step 2 or 3
        if (active.selectedImages && active.selectedImages.length > 0) {
           if (roomData.step < 2) roomData.step = 3; 
        }
        // If we have slots filled, we must be at least at step 3 or 4
        if (active.slots && active.slots.some(s => s.imageId)) {
           if (roomData.step < 3) roomData.step = 4;
        }
        roomData.timerStarted = false;
        roomData.lastImageTime = Date.now();
        
        if (this.activeRoom === room) {
          if (active.currentTemplate) this.currentTemplate = active.currentTemplate;
          if (active.slots) this.slots = active.slots;
          if (active.selectedImages) {
            this.selectedPhotos = new Set(active.selectedImages);
          } else {
            this.selectedPhotos.clear();
          }
        }
        
        roomData.images = active.images
          .filter(url => !url.includes('00_frame.jpg'))
          .map(url => {
          const id = 'img_' + url.replace(/[^a-zA-Z0-9]/g, '_');
          this._preloadImage(id, url).then(() => {
            if (this.activeRoom === room) this._renderCanvas();
          });
          return { id, url, name: url.split('/').pop() };
        });
        
        if (this.activeRoom === room) {
          // Ensure template images are loaded when session is restored
          if (this.currentTemplate) {
            this._loadTemplateImages();
          }
          
          // We will NOT wipe slot data based on validIds because it causes F5 data loss
          // if the server state and client state are momentarily out of sync.
          // Keep selectedPhotos and slots as they came from the server.
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
           const qLen = roomData.queue ? roomData.queue.length - 1 : 0;
           let html = '';
           if (qLen > 0) {
             html += `<span style="color:#eab308; margin-right:6px; display:inline-flex; align-items:center;">
               <svg class="pl-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; animation: pl-spin 2s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg>
               ${qLen}
             </span>`;
           }
           const imgCount = roomData.images ? roomData.images.length : 0;
           html += `Phiên: ${roomData.session} (${imgCount} ảnh)`;
           lbl.innerHTML = html;
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
    }).catch(err => console.error('Sync error:', err));
  }
,

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
