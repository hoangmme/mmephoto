// Màn hình Nhân Viên (Staff View)
const SERVER_URL = 'http://localhost:3000'; // Sẽ lấy từ localStorage nếu có

const A5_WIDTH = 1748;
const A5_HEIGHT = 2480;
const PADDING = 40;

const TEMPLATES = {
  '1photo': {
    name: '1 Photo',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: A5_HEIGHT - PADDING * 2 }
    ]
  },
  '2photos': {
    name: '2 Photos',
    slots: [
      { x: PADDING, y: PADDING, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: A5_WIDTH - PADDING * 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  },
  '4photos': {
    name: '4 Photos',
    slots: [
      { x: PADDING, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 },
      { x: PADDING * 2 + (A5_WIDTH - PADDING * 3) / 2, y: PADDING * 2 + (A5_HEIGHT - PADDING * 3) / 2, w: (A5_WIDTH - PADDING * 3) / 2, h: (A5_HEIGHT - PADDING * 3) / 2 }
    ]
  }
};

const parsedDefaults = {};
Object.keys(TEMPLATES).forEach(k => {
  parsedDefaults[k] = {
    name: TEMPLATES[k].name,
    slots: TEMPLATES[k].slots.map(s => ({
      cx: s.x + s.w/2,
      cy: s.y + s.h/2,
      w: s.w,
      h: s.h,
      rotation: 0
    })),
    canvas_width: A5_WIDTH,
    canvas_height: A5_HEIGHT
  };
});

let ALL_TEMPLATES = { ...parsedDefaults };

class StaffView {
  constructor() {
    this.branch = localStorage.getItem('branchId') || localStorage.getItem('pl_branch') || '';
    this.password = localStorage.getItem('branchPass') || localStorage.getItem('pl_password') || '';
    
    this.rooms = {};
    this.sessions = {};
    this.activeRoom = null;
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
        const arr = await res.json();
        const templatesObj = {};
        arr.forEach(t => {
          templatesObj[t.id] = {
            ...t,
            name: t.name || 'Template',
            slots: t.slots.map(s => ({
              ...s,
              x: s.cx !== undefined ? s.cx : (s.x + (s.width||s.w||0)/2),
              y: s.cy !== undefined ? s.cy : (s.y + (s.height||s.h||0)/2),
              w: s.width || s.w,
              h: s.height || s.h,
              rotation: s.rotation || 0
            })),
            canvas_width: t.canvas_width || 1748,
            canvas_height: t.canvas_height || 2480
          };
        });
        ALL_TEMPLATES = { ...ALL_TEMPLATES, ...templatesObj };
      }
    } catch(e) {
      console.error('Failed to load templates', e);
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
           this.rooms[roomName] = true;
           if (data.sessions && data.sessions.length > 0) {
             data.sessions.forEach(sess => {
               this.sessions[sess.id] = {
                 room: roomName,
                 session: sess.id,
                 step: sess.step || 1,
                 currentTemplate: sess.currentTemplate,
                 slots: sess.slots || [],
                 images: sess.images || []
               };
             });
           }
           
           if (!this.activeRoom && Object.keys(this.rooms).length > 0) {
             this.activeRoom = Object.keys(this.rooms)[0];
           }
           
           this._renderTabs();
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
           this.rooms[data.room] = true;
           this._renderTabs();
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

  _renderTabs() {
    const tabsContainer = document.getElementById('roomTabs');
    if (!tabsContainer) return;
    
    const rooms = Object.keys(this.rooms);
    if (rooms.length === 0) {
      tabsContainer.style.display = 'none';
      return;
    }
    
    tabsContainer.style.display = 'flex';
    tabsContainer.innerHTML = '';
    
    if (!this.activeRoom || !rooms.includes(this.activeRoom)) {
      this.activeRoom = rooms[0];
    }

    rooms.forEach(room => {
      const btn = document.createElement('button');
      btn.className = `pl-tab ${room === this.activeRoom ? 'active' : ''}`;
      btn.textContent = `Phòng: ${room}`;
      btn.onclick = () => {
        this.activeRoom = room;
        this._renderTabs();
        this._renderGrid();
      };
      tabsContainer.appendChild(btn);
    });
  }

  _renderGrid() {
    const grid = document.getElementById('staffGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let hasCompletedRooms = false;

    // Filter sessions by active room and step >= 4
    const roomSessions = Object.keys(this.sessions)
      .map(id => this.sessions[id])
      .filter(room => room.room === this.activeRoom && room.session && room.step >= 4);

    roomSessions.forEach(room => {
      const roomName = room.room;
      hasCompletedRooms = true;
      const tId = room.currentTemplate;
      const t = ALL_TEMPLATES[tId];

      const card = document.createElement('div');
      card.className = 'staff-card';

      // Render images list
      const rawImages = (room.images || []).filter(img => typeof img === 'string' ? !img.includes('00_frame.jpg') : (img.url ? !img.url.includes('00_frame.jpg') : true));
      const imagesHtml = rawImages.map((img, idx) => {
        const url = typeof img === 'string' ? img : img.url;
        return `
          <div style="position: relative; border: 1px solid var(--pl-border); border-radius: 4px; overflow: hidden; background: #000; flex-shrink: 0;">
            <img src="${url}" style="width: 100%; height: auto; display: block;">
            <a href="${url}" download="${roomName}_${room.session}_img${idx+1}.jpg" target="_blank" style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-decoration: none;">Tải</a>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="staff-card-header">
          <div>
            <div class="staff-card-title">Phiên: ${room.session}</div>
          </div>
          <button class="pl-btn pl-btn-primary" style="padding: 6px 12px; font-size: 13px;" id="btnDownload_${room.session}" ${!t ? 'disabled title="Thiếu template"' : ''}>
             Tải Ảnh Layout
          </button>
        </div>
        <div style="display: flex; gap: 15px; flex: 1; min-height: 0;">
          <div style="width: 100px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 5px;">
            ${imagesHtml}
          </div>
          <div class="staff-card-canvas" id="canvasContainer_${room.session}" style="flex: 1; max-width: calc(100% - 115px);">
             ${t ? `<canvas width="${t.canvas_width || A5_WIDTH}" height="${t.canvas_height || A5_HEIGHT}" id="canvas_${room.session}"></canvas>` 
                 : `<div style="padding:20px; text-align:center; color:var(--pl-text-muted); width: 100%;">Template <b>${tId}</b> chưa được đồng bộ sang máy này.<br>Hãy tạo JSON và import vào màn hình này.</div>`}
          </div>
        </div>
      `;
      grid.appendChild(card);

      if (t) {
        const canvas = document.getElementById(`canvas_${room.session}`);
        const editor = new StaffCanvasEditor(canvas, room, t, this);

        // Sidebar image click logic
        const sidebarImages = document.querySelectorAll(`#canvasContainer_${room.session}`).item(0).previousElementSibling.querySelectorAll('img');
        sidebarImages.forEach(img => {
           img.addEventListener('click', (e) => {
              const url = e.target.getAttribute('src');
              this.selectedSidebarImage = url;
              // Add border to selected image
              sidebarImages.forEach(i => i.parentElement.style.borderColor = 'var(--pl-border)');
              e.target.parentElement.style.borderColor = 'red';
           });
        });

        document.getElementById(`btnDownload_${room.session}`).addEventListener('click', () => {
           this._downloadCanvas(canvas, roomName, room.session);
        });
      }
    });

    if (!hasCompletedRooms) {
      grid.innerHTML = `<div class="empty-state">Phòng ${this.activeRoom || ''} hiện không có phiên chụp nào đã hoàn thành (Bước 4).</div>`;
    }
  }

  clearSidebarSelection() {
     this.selectedSidebarImage = null;
     document.querySelectorAll('.staff-card img').forEach(img => {
        img.parentElement.style.borderColor = 'var(--pl-border)';
     });
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

class StaffCanvasEditor {
  constructor(canvas, room, templateData, staffView) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.room = room; // This contains room.slots and room.images
    this.templateData = templateData;
    this.staffView = staffView;
    
    // Editor State
    this.activeSlotIndex = -1;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    
    // Bind events
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this._onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    
    // Ensure all slots have defaults
    this.room.slots.forEach(slot => {
      if (!slot) return;
      if (slot.panX === undefined) slot.panX = 0;
      if (slot.panY === undefined) slot.panY = 0;
      if (slot.scale === undefined) slot.scale = 1;
      if (slot.rotation === undefined) slot.rotation = 0;
    });
    
    this.draw();
  }
  
  _getEventPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
  
  _findSlotAt(x, y) {
    for (let i = this.templateData.slots.length - 1; i >= 0; i--) {
      const slotDef = this.templateData.slots[i];
      const slotX = slotDef.x || (slotDef.cx - slotDef.w/2);
      const slotY = slotDef.y || (slotDef.cy - slotDef.h/2);
      if (x >= slotX && x <= slotX + slotDef.w &&
          y >= slotY && y <= slotY + slotDef.h) {
        return i;
      }
    }
    return -1;
  }
  
  _onMouseDown(e) {
    const pos = this._getEventPos(e);
    const clickedSlot = this._findSlotAt(pos.x, pos.y);
    
    if (clickedSlot !== -1) {
      this.activeSlotIndex = clickedSlot;
      // If a sidebar image is selected, swap it!
      if (this.staffView.selectedSidebarImage) {
        const url = this.staffView.selectedSidebarImage;
        const imgIdx = this.room.images.findIndex(img => (typeof img === 'string' ? img : img.url) === url);
        if (imgIdx !== -1) {
          if (!this.room.slots[clickedSlot]) {
             this.room.slots[clickedSlot] = { panX: 0, panY: 0, scale: 1, rotation: 0 };
          }
          this.room.slots[clickedSlot].imageId = imgIdx;
          this.room.slots[clickedSlot].panX = 0;
          this.room.slots[clickedSlot].panY = 0;
          this.room.slots[clickedSlot].scale = 1;
          this.room.slots[clickedSlot].rotation = 0;
          this.draw();
          // Clear selection
          this.staffView.clearSidebarSelection();
          return;
        }
      }
      
      // Start panning
      if (this.room.slots[this.activeSlotIndex] && this.room.slots[this.activeSlotIndex].imageId !== undefined) {
        this.isPanning = true;
        this.startX = pos.x;
        this.startY = pos.y;
      }
    }
  }
  
  _onMouseMove(e) {
    if (!this.isPanning || this.activeSlotIndex === -1) return;
    const pos = this._getEventPos(e);
    const dx = pos.x - this.startX;
    const dy = pos.y - this.startY;
    
    const slot = this.room.slots[this.activeSlotIndex];
    if (!slot) return;
    
    const slotDef = this.templateData.slots[this.activeSlotIndex];
    
    let adjustX = dx;
    let adjustY = dy;
    
    const rot = slot.rotation || 0;
    if (rot === 90) { adjustX = dy; adjustY = -dx; }
    else if (rot === 180) { adjustX = -dx; adjustY = -dy; }
    else if (rot === 270) { adjustX = -dy; adjustY = dx; }
    
    const scale = slot.scale || 1;
    slot.panX += adjustX / scale;
    slot.panY += adjustY / scale;
    
    this.startX = pos.x;
    this.startY = pos.y;
    
    this.draw();
  }
  
  _onMouseUp() {
    this.isPanning = false;
  }
  
  _onWheel(e) {
    const pos = this._getEventPos(e);
    const clickedSlot = this._findSlotAt(pos.x, pos.y);
    if (clickedSlot === -1) return;
    
    const slot = this.room.slots[clickedSlot];
    if (!slot || slot.imageId === undefined) return;
    
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 0.95 : 1.05;
    slot.scale = (slot.scale || 1) * zoomDelta;
    this.draw();
  }
  
  async draw() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const templateData = this.templateData;
    const room = this.room;
    
    // Fill background
    if (templateData.background_color) {
      ctx.fillStyle = templateData.background_color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (templateData.background_image) {
      const bgImg = await this.staffView._loadImage(templateData.background_image);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      }
    }

    // Slots
    if (templateData.slots) {
      for (let i = 0; i < templateData.slots.length; i++) {
        const slotDef = templateData.slots[i];
        const slotX = slotDef.x || (slotDef.cx - slotDef.w/2);
        const slotY = slotDef.y || (slotDef.cy - slotDef.h/2);

        ctx.save();
        
        ctx.beginPath();
        if (slotDef.radius) {
          ctx.roundRect(slotX, slotY, slotDef.w, slotDef.h, slotDef.radius);
        } else {
          ctx.rect(slotX, slotY, slotDef.w, slotDef.h);
        }
        ctx.clip();
        
        ctx.fillStyle = '#eeeeee';
        ctx.fill();
        
        if (room.slots[i]) {
            const userSlot = room.slots[i];
            if (userSlot.imageId !== undefined && userSlot.imageId !== null && room.images[userSlot.imageId]) {
              const imgUrl = typeof room.images[userSlot.imageId] === 'string' ? room.images[userSlot.imageId] : room.images[userSlot.imageId].url;
              if (imgUrl) {
                const userImg = await this.staffView._loadImage(imgUrl);
                if (userImg) {
                  ctx.save();
                  
                  ctx.translate(slotX + slotDef.w/2, slotY + slotDef.h/2);
                  
                  const rotation = userSlot.rotation || 0;
                  ctx.rotate(rotation * Math.PI / 180);
                  
                  const scale = userSlot.scale || 1;
                  const panX = userSlot.panX || 0;
                  const panY = userSlot.panY || 0;
                  
                  ctx.translate(panX, panY);
                  ctx.scale(scale, scale);
                  
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
                }
              }
            }
        }
        
        ctx.restore();
      }
    }

    // Frame / Overlay
    const frameSrc = templateData.frame_url || templateData.overlay_image;
    if (frameSrc) {
      const ovImg = await this.staffView._loadImage(frameSrc);
      if (ovImg) {
        ctx.drawImage(ovImg, 0, 0, canvas.width, canvas.height);
      }
    }
  }
}
