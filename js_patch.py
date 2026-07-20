import re

with open('js/print-layout.js', 'r', encoding='utf-8') as f:
    content = f.read()

init_sse_code = """
  _initSSE(branch, room) {
    if (this.sse) this.sse.close();
    this.sse = new EventSource(`/api/stream/${branch}/${room}`);
    
    this.sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'init') {
        this.images = [];
        data.images.forEach(url => {
          const id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          this.images.push({ id, url });
        });
        this._renderImageList();
        if (data.session) this._updateQRCode(data.session);
        if (data.images.length > 0) this._startTimer();
      } else if (data.type === 'new_image') {
        if (this.images.length === 0) this._startTimer();
        const id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.images.push({ id, url: data.imageUrl });
        this._renderImageList();
        this._updateQRCode(data.session);
      } else if (data.type === 'reset') {
        this.images = [];
        this._renderImageList();
        this._stopTimer();
        const qrOverlay = document.getElementById('qrOverlay');
        if (qrOverlay) qrOverlay.style.display = 'none';
      }
    };
  }

  _startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    let timeLeft = 180; // 3 minutes
    const el = document.getElementById('countdownTimer');
    if (!el) return;
    el.style.display = 'block';
    
    this.timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.timerInterval);
        const lock = document.getElementById('lockOverlay');
        if (lock) lock.style.display = 'flex';
        el.innerText = '00:00';
      } else {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        el.innerText = `${m}:${s}`;
      }
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const el = document.getElementById('countdownTimer');
    if (el) el.style.display = 'none';
  }

  _updateQRCode(session) {
    const qrOverlay = document.getElementById('qrOverlay');
    if (!qrOverlay) return;
    qrOverlay.style.display = 'block';
    const canvas = document.getElementById('qrCanvas');
    const url = `${window.location.origin}/download.html?session=${session}`;
    if (window.QRCode) {
      window.QRCode.toCanvas(canvas, url, { width: 120, margin: 1 }, function (error) {
        if (error) console.error(error);
      });
    }
  }
"""

# Insert _initSSE before _initApp()
content = content.replace("  async _initApp() {", init_sse_code + "\\n  async _initApp() {")

init_app_patch = """
    // --- Login & Branch Logic ---
    const branchId = localStorage.getItem('branchId');
    const roomId = localStorage.getItem('roomId');
    const loginOverlay = document.getElementById('loginOverlay');
    const lockOverlay = document.getElementById('lockOverlay');
    
    if (!branchId || !roomId) {
      if(loginOverlay) loginOverlay.style.display = 'flex';
    } else {
      if(loginOverlay) loginOverlay.style.display = 'none';
      this._initSSE(branchId, roomId);
    }
    
    document.getElementById('btnLoginSubmit')?.addEventListener('click', async () => {
      const branch = document.getElementById('loginBranch').value.trim();
      const pass = document.getElementById('loginPassword').value.trim();
      const room = document.getElementById('loginRoom').value.trim();
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branchId: branch, password: pass})
      });
      
      if (res.ok) {
        localStorage.setItem('branchId', branch);
        localStorage.setItem('roomId', room);
        loginOverlay.style.display = 'none';
        this._initSSE(branch, room);
      } else {
        document.getElementById('loginError').style.display = 'block';
      }
    });
    
    document.getElementById('btnUnlock')?.addEventListener('click', () => {
      if(lockOverlay) lockOverlay.style.display = 'none';
      const btnNext = document.getElementById('btnNextCustomer');
      if (btnNext) btnNext.style.display = 'inline-flex';
    });
    
    document.getElementById('btnNextCustomer')?.addEventListener('click', async () => {
      const b = localStorage.getItem('branchId');
      const r = localStorage.getItem('roomId');
      if (b && r) {
        await fetch(`/api/next-session/${b}/${r}`, { method: 'POST' });
      }
      const btnNext = document.getElementById('btnNextCustomer');
      if (btnNext) btnNext.style.display = 'none';
    });
    // ----------------------------
"""

# Insert init_app_patch inside _initApp() try block
content = content.replace("  async _initApp() {\\n    try {", "  async _initApp() {\\n    try {\\n" + init_app_patch)

with open('js/print-layout.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched js/print-layout.js successfully.")
