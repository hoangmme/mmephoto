import re

with open('js/print-layout.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace everything from _initSSE(branch, room) { to _updateQRCode(session) { ... }
# Let's locate the start and end of this block.
start_idx = content.find('  _initSSE(branch, room) {')
end_idx = content.find('  async _initApp() {')

if start_idx != -1 and end_idx != -1:
    new_logic = """
  _initSSE(branch) {
    if (this.sse) this.sse.close();
    this.sse = new EventSource(`/api/stream/${branch}`);
    
    this.sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'init') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 180, locked: false, hasNew: false };
        this.rooms[room].session = data.session;
        this.rooms[room].images = data.images.map(url => ({ id: 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000), url }));
        if (this.rooms[room].images.length > 0) this._startTimer(room);
        this._renderTabs();
        this._updateUIForRoom();
      } else if (data.type === 'new_image') {
        const room = data.room;
        if (!this.rooms[room]) this.rooms[room] = { images: [], timerInterval: null, timeLeft: 180, locked: false, hasNew: false };
        if (this.rooms[room].images.length === 0) this._startTimer(room);
        this.rooms[room].session = data.session;
        this.rooms[room].images.push({ id: 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000), url: data.imageUrl });
        
        if (this.activeRoom !== room) {
          this.rooms[room].hasNew = true;
          this._renderTabs();
        } else {
          this._updateUIForRoom();
        }
      } else if (data.type === 'reset') {
        const room = data.room;
        if (this.rooms[room]) {
          this._stopTimer(room);
          delete this.rooms[room];
          if (this.activeRoom === room) {
            this.activeRoom = Object.keys(this.rooms)[0] || null;
            this._updateUIForRoom();
          }
          this._renderTabs();
        }
      }
    };
  }
  
  _renderTabs() {
    const tabsContainer = document.getElementById('roomTabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';
    const rooms = Object.keys(this.rooms).sort();
    
    if (rooms.length > 0 && !this.activeRoom) {
      this.activeRoom = rooms[0];
      this._updateUIForRoom();
    }
    
    rooms.forEach(room => {
      const btn = document.createElement('button');
      btn.innerText = room;
      btn.style.padding = '8px 12px';
      btn.style.border = '1px solid var(--pl-border)';
      btn.style.borderRadius = '6px 6px 0 0';
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
    if (!this.activeRoom || !this.rooms[this.activeRoom]) {
      this.images = [];
      this._renderImageList();
      document.getElementById('countdownTimer').style.display = 'none';
      document.getElementById('qrOverlay').style.display = 'none';
      document.getElementById('lockOverlay').style.display = 'none';
      return;
    }
    
    const roomData = this.rooms[this.activeRoom];
    this.images = roomData.images;
    this._renderImageList();
    
    // Timer update
    const el = document.getElementById('countdownTimer');
    el.style.display = 'block';
    if (roomData.locked) {
      document.getElementById('lockOverlay').style.display = 'flex';
      el.innerText = '00:00';
    } else {
      document.getElementById('lockOverlay').style.display = 'none';
      const m = Math.floor(roomData.timeLeft / 60).toString().padStart(2, '0');
      const s = (roomData.timeLeft % 60).toString().padStart(2, '0');
      el.innerText = `${m}:${s}`;
    }
    
    // QR Code
    if (roomData.session) {
      this._updateQRCode(this.activeRoom, roomData.session);
    }
  }

  _startTimer(room) {
    if (this.rooms[room].timerInterval) clearInterval(this.rooms[room].timerInterval);
    this.rooms[room].timeLeft = 180; // 3 minutes
    this.rooms[room].locked = false;
    
    this.rooms[room].timerInterval = setInterval(() => {
      this.rooms[room].timeLeft--;
      if (this.rooms[room].timeLeft <= 0) {
        clearInterval(this.rooms[room].timerInterval);
        this.rooms[room].locked = true;
      }
      if (this.activeRoom === room) {
        this._updateUIForRoom();
      }
    }, 1000);
  }

  _stopTimer(room) {
    if (this.rooms[room].timerInterval) clearInterval(this.rooms[room].timerInterval);
  }

  _updateQRCode(room, session) {
    const qrOverlay = document.getElementById('qrOverlay');
    if (!qrOverlay) return;
    qrOverlay.style.display = 'block';
    const canvas = document.getElementById('qrCanvas');
    const b = localStorage.getItem('branchId') || '';
    const url = `${window.location.origin}/download.html?branch=${b}&room=${room}&session=${session}`;
    if (window.QRCode) {
      window.QRCode.toCanvas(canvas, url, { width: 120, margin: 1 }, function (error) {
        if (error) console.error(error);
      });
    }
  }

"""
    content = content[:start_idx] + new_logic + content[end_idx:]

    # Now add this.rooms and this.activeRoom to constructor
    content = content.replace("this.batchId = params.get('batch');", "this.batchId = params.get('batch');\\n    this.rooms = {};\\n    this.activeRoom = null;\\n")
    
    # Add _initLogin to class
    login_logic = """
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
        const btnNext = document.getElementById('btnNextCustomer');
        if (btnNext) btnNext.style.display = 'inline-flex';
      }
    });
    
    document.getElementById('btnNextCustomer')?.addEventListener('click', async () => {
      const b = localStorage.getItem('branchId');
      const r = this.activeRoom;
      if (b && r) {
        await fetch(`/api/next-session/${b}/${r}`, { method: 'POST' });
      }
      const btnNext = document.getElementById('btnNextCustomer');
      if (btnNext) btnNext.style.display = 'none';
    });
  }
"""
    content = content.replace("  async _initApp() {", login_logic + "\\n  async _initApp() {")
    content = content.replace("    this._loadBatch();", "    this._loadBatch();\\n    this._initLogin();")
    
    with open('js/print-layout.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched js/print-layout.js for multi-room successfully.")
else:
    print("Failed to locate start and end index.")
