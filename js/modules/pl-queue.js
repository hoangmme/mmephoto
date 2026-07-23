import { ALL_TEMPLATES, customTemplates, isStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

export const QueueMixin = {
  _initQueueManager() {
    const btnQueueManager = document.getElementById('btnQueueManager');
    const queueModalOverlay = document.getElementById('queueModalOverlay');
    const btnCloseQueueModal = document.getElementById('btnCloseQueueModal');

    if (btnQueueManager && queueModalOverlay && btnCloseQueueModal) {
      btnQueueManager.addEventListener('click', () => {
        this._renderQueueModal();
        queueModalOverlay.style.display = 'flex';
      });

      btnCloseQueueModal.addEventListener('click', () => {
        queueModalOverlay.style.display = 'none';
      });

      // Close on clicking outside
      queueModalOverlay.addEventListener('click', (e) => {
        if (e.target === queueModalOverlay) {
          queueModalOverlay.style.display = 'none';
        }
      });
    }
  },

  _renderQueueModal() {
    const container = document.getElementById('queueListContainer');
    if (!container) return;
    
    if (!this.activeRoom || !this.rooms[this.activeRoom]) {
      container.innerHTML = '<div style="color:var(--pl-text); text-align:center;">Chưa chọn phòng nào</div>';
      return;
    }

    const roomData = this.rooms[this.activeRoom];
    if (!roomData.queue || roomData.queue.length === 0) {
      container.innerHTML = '<div style="color:var(--pl-text); text-align:center; font-style:italic;">Hàng chờ đang trống</div>';
      return;
    }

    let html = '';
    roomData.queue.forEach((sess) => {
      const isActive = sess.id === roomData.activeSessionId;
      const stepStr = sess.step ? `Bước ${sess.step}` : 'Đang xử lý';
      
      html += `
        <div style="background: ${isActive ? 'var(--pl-accent)' : 'var(--pl-bg-section)'}; border: 1px solid var(--pl-border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
            <div style="font-weight: 600; color: ${isActive ? '#fff' : 'var(--pl-text)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;" title="${sess.id}">
              ${sess.id}
            </div>
            <div style="font-size: 12px; color: ${isActive ? 'rgba(255,255,255,0.8)' : 'var(--pl-text)'}; opacity: 0.8;">
              Trạng thái: ${stepStr} | Ảnh đã chọn: ${sess.selectedImages ? sess.selectedImages.length : 0}
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            ${!isActive ? `
              <button class="pl-btn" style="padding: 6px 12px; font-size: 12px; background: #fff; color: #000; border: none; font-weight: 600; cursor: pointer;" onclick="window.printApp._setActiveSession('${sess.id}')">
                Chọn
              </button>
            ` : `
              <span style="font-size:12px; font-weight:bold; color:#fff; padding:6px; margin-right:10px;">ĐANG CHỌN</span>
            `}
            <button class="pl-btn" style="padding: 6px 12px; font-size: 12px; background: #ef4444; color: #fff; border: none; font-weight: 600; cursor: pointer;" onclick="window.printApp._finishSessionFromQueue('${sess.id}')">
              Xóa
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  async _setActiveSession(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      const res = await fetch(`/api/set-active-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        // Will receive active_session_changed via SSE, or we can just wait for init
      }
    } catch (err) {
      console.error('Failed to set active session:', err);
    }
  },

  async _finishSessionFromQueue(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      await fetch(`/api/finish-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      // SSE will broadcast session_finished and queue will update
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  }
};
