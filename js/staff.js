// Màn hình Nhân Viên (Staff View)
const SERVER_URL = 'http://localhost:3000'; // Sẽ lấy từ localStorage nếu có

let ALL_TEMPLATES = {};
const A5_WIDTH = 1748;
const A5_HEIGHT = 2480;

class StaffView {
  constructor() {
    this.branch = localStorage.getItem('branchId') || localStorage.getItem('pl_branch') || '';
    this.password = localStorage.getItem('branchPass') || localStorage.getItem('pl_password') || '';
    
    this.rooms = {};
    this.eventSource = null;
    this.imageObjects = {}; // Cache images

    this._initLogin();
  }

  async _initLogin() {
    const overlay = document.getElementById('loginOverlay');
    const btnSubmit = document.getElementById('btnLoginSubmit');
    const inputBranch = document.getElementById('loginBranch');
    const inputPass = document.getElementById('loginPassword');
    const errorMsg = document.getElementById('loginError');

    if (this.branch && this.password) {
      // Validate
      const isValid = await this._checkLogin(this.branch, this.password);
      if (isValid) {
        overlay.style.display = 'none';
        document.getElementById('headerBranchName').textContent = this.branch;
        document.getElementById('headerBranchName').style.display = 'inline';
        this._initTemplates();
      } else {
        overlay.style.display = 'flex';
      }
    } else {
      overlay.style.display = 'flex';
    }

    btnSubmit.addEventListener('click', async () => {
      const b = inputBranch.value.trim();
      const p = inputPass.value.trim();
      if (!b || !p) return;

      btnSubmit.textContent = 'Đang kiểm tra...';
      const isValid = await this._checkLogin(b, p);
      btnSubmit.textContent = 'Đang Nhập';

      if (isValid) {
        this.branch = b;
        this.password = p;
        localStorage.setItem('pl_branch', b);
        localStorage.setItem('pl_password', p);
        overlay.style.display = 'none';
        document.getElementById('headerBranchName').textContent = b;
        document.getElementById('headerBranchName').style.display = 'inline';
        this._initTemplates();
      } else {
        errorMsg.style.display = 'block';
      }
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
      localStorage.removeItem('pl_branch');
      localStorage.removeItem('pl_password');
      window.location.reload();
    });
  }

  async _checkLogin(branch, password) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branchId: branch, password: password})
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async _initTemplates() {
    try {
      const res = await fetch(`/api/templates`);
      if (res.ok) {
        ALL_TEMPLATES = await res.json();
      }
    } catch(e) {
      console.error('Failed to load templates.json', e);
    }
    
    // Load custom templates from local storage
    const customStr = localStorage.getItem('pl_custom_templates');
    if (customStr) {
      try {
        const customObj = JSON.parse(customStr);
        ALL_TEMPLATES = { ...ALL_TEMPLATES, ...customObj };
      } catch(e) {}
    }

    this._connectSSE();
  }

  _connectSSE() {
    if (this.eventSource) this.eventSource.close();
    
    this.eventSource = new EventSource(`/api/stream/${this.branch}`);
    
    this.eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init') {
           const roomName = data.room;
           if (data.sessions && data.sessions.length > 0) {
             data.sessions.forEach(sess => {
               this.sessions[sess.id] = {
                 room: roomName,
                 session: sess.id,
                 step: sess.step || 1,
                 currentTemplate: sess.currentTemplate || null,
                 selectedImages: sess.selectedImages || [],
                 slots: sess.slots || [],
                 images: sess.images || []
               };
             });
           }
           this._renderGrid();
        } else if (data.type === 'sync') {
           this.sessions[data.session] = {
             room: data.room,
             session: data.session,
             step: data.step || 1,
             currentTemplate: data.currentTemplate || null,
             selectedImages: data.selectedImages || [],
             slots: data.slots || [],
             images: data.images || []
           };
           this._renderGrid();
        } else if (data.type === 'session_finished') {
           // We no longer hide the session when it finishes.
           // It stays on screen so staff can download.
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };
  }

  _renderGrid() {
    const grid = document.getElementById('staffGrid');
    grid.innerHTML = '';
    
    let hasCompletedRooms = false;

    // Filter only sessions that are at step 4
    Object.keys(this.sessions).forEach(sessionId => {
      const room = this.sessions[sessionId];
      if (!room.session) return;
      if (room.step < 4) return; // Only show completed sessions (Step 4)
      if (!room.currentTemplate) return;

      const roomName = room.room;
      hasCompletedRooms = true;
      const tId = room.currentTemplate;
      const t = ALL_TEMPLATES[tId];

      const card = document.createElement('div');
      card.className = 'staff-card';

      card.innerHTML = `
        <div class="staff-card-header">
          <div>
            <div class="staff-card-title">Phòng: ${roomName}</div>
            <div class="staff-card-subtitle">Phiên: ${room.session}</div>
          </div>
          <button class="pl-btn pl-btn-primary" style="padding: 6px 12px; font-size: 13px;" id="btnDownload_${roomName}" ${!t ? 'disabled title="Thiếu template"' : ''}>
             Tải Ảnh
          </button>
        </div>
        <div class="staff-card-canvas" id="canvasContainer_${roomName}">
           ${t ? `<canvas width="${t.canvas_width || A5_WIDTH}" height="${t.canvas_height || A5_HEIGHT}" id="canvas_${roomName}"></canvas>` 
               : `<div style="padding:20px; text-align:center; color:var(--pl-text-muted);">Template <b>${tId}</b> chưa được đồng bộ sang máy này.<br>Hãy tạo JSON và import vào màn hình này nếu cần xem layout.</div>`}
        </div>
      `;
      grid.appendChild(card);

      if (t) {
        const canvas = document.getElementById(`canvas_${roomName}`);
        this._drawRoomCanvas(canvas, room, t);

        document.getElementById(`btnDownload_${roomName}`).addEventListener('click', () => {
           this._downloadCanvas(canvas, roomName, room.session);
        });
      }
    });

    if (!hasCompletedRooms) {
      grid.innerHTML = `<div class="empty-state">Hiện không có phiên chụp nào đã hoàn thành (Bước 4).</div>`;
    }
  }

  async _drawRoomCanvas(canvas, room, templateData) {
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = templateData.background_color || '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (templateData.background_image) {
      const bgImg = await this._loadImage(templateData.background_image);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      }
    }

    // Draw slots
    for (let i = 0; i < templateData.slots.length; i++) {
      const slotDef = templateData.slots[i];
      let imgId = null;
      let panX = 0;
      let panY = 0;
      let rotation = 0;

      if (room.slots && room.slots[i]) {
        imgId = room.slots[i].imageId;
        panX = room.slots[i].panX || 0;
        panY = room.slots[i].panY || 0;
        rotation = room.slots[i].rotation || 0;
      } else if (room.selectedImages && room.selectedImages[i]) {
        imgId = room.selectedImages[i];
      }

      if (imgId) {
        // Find image url
        const imgObj = room.images.find(img => img.id === imgId);
        if (imgObj) {
           const srcUrl = imgObj.url;
           if (srcUrl) {
             const userImg = await this._loadImage(srcUrl);
             if (userImg) {
               ctx.save();
               ctx.translate(slotDef.x, slotDef.y);
               
               // Clip to slot
               ctx.save();
               ctx.beginPath();
               ctx.rect(-slotDef.w/2, -slotDef.h/2, slotDef.w, slotDef.h);
               ctx.clip();
               
               ctx.translate(panX, panY);
               
               if (rotation !== 0) {
                 ctx.rotate(rotation * Math.PI / 180);
               }

               // Calculate fill
               let drawW = slotDef.w;
               let drawH = slotDef.h;
               
               let aspectSlot = slotDef.w / slotDef.h;
               let aspectImg = userImg.width / userImg.height;

               if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
                 aspectSlot = slotDef.h / slotDef.w;
               }
               
               if (aspectImg > aspectSlot) {
                 drawH = (rotation % 180 !== 0) ? slotDef.w : slotDef.h;
                 drawW = drawH * aspectImg;
               } else {
                 drawW = (rotation % 180 !== 0) ? slotDef.h : slotDef.w;
                 drawH = drawW / aspectImg;
               }

               ctx.drawImage(userImg, -drawW/2, -drawH/2, drawW, drawH);
               ctx.restore();
               ctx.restore();
             }
           }
        }
      }
    }

    // Overlay
    if (templateData.overlay_image) {
      const ovImg = await this._loadImage(templateData.overlay_image);
      if (ovImg) {
        ctx.drawImage(ovImg, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  _loadImage(url) {
    return new Promise((resolve) => {
      if (this.imageObjects[url]) return resolve(this.imageObjects[url]);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        this.imageObjects[url] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  _downloadCanvas(canvas, roomName, session) {
     const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
     const link = document.createElement('a');
     link.download = `${roomName}_${session}.jpg`;
     link.href = dataUrl;
     link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.staffView = new StaffView();
});
