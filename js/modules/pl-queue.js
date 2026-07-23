import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from "./pl-globals.js";

export const QueueMixin = {
  queueTab: 'active',

  _initQueueManager() {
    const btnQueueManager = document.getElementById('btnQueueManager');
    const queueModalOverlay = document.getElementById('queueModalOverlay');
    const btnCloseQueueModal = document.getElementById('btnCloseQueueModal');

    if (btnQueueManager && queueModalOverlay && btnCloseQueueModal) {
      btnQueueManager.addEventListener('click', () => {
        this.queueTab = 'active';
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
      container.innerHTML = '<div style="color:var(--pl-text); text-align:center; padding:20px;">Chưa chọn phòng nào</div>';
      return;
    }

    const roomData = this.rooms[this.activeRoom];
    const allSessions = roomData.queue || [];
    const activeSessions = allSessions.filter(s => !s.finished);
    const finishedSessions = allSessions.filter(s => s.finished);

    const currentTab = this.queueTab || 'active';
    const displayList = currentTab === 'active' ? activeSessions : finishedSessions;

    let html = `
      <div style="display:flex; border-bottom:1px solid var(--pl-border); margin-bottom:12px; gap:8px;">
        <button id="tabQueueActive" class="pl-btn" style="flex:1; justify-content:center; border-radius:6px 6px 0 0; font-weight:600; background:${currentTab === 'active' ? 'var(--pl-accent)' : 'var(--pl-bg-section)'}; color:${currentTab === 'active' ? '#fff' : 'var(--pl-text)'}; border:1px solid var(--pl-border); border-bottom:none;">
          ⏳ Đang Chờ (${activeSessions.length})
        </button>
        <button id="tabQueueFinished" class="pl-btn" style="flex:1; justify-content:center; border-radius:6px 6px 0 0; font-weight:600; background:${currentTab === 'finished' ? 'var(--pl-accent)' : 'var(--pl-bg-section)'}; color:${currentTab === 'finished' ? '#fff' : 'var(--pl-text)'}; border:1px solid var(--pl-border); border-bottom:none;">
          ✅ Đã Hoàn Thành (${finishedSessions.length})
        </button>
      </div>
    `;

    if (displayList.length === 0) {
      html += `<div style="color:var(--pl-text-muted); text-align:center; padding:30px 0; font-style:italic;">Danh sách ${currentTab === 'active' ? 'đang chờ' : 'đã hoàn thành'} đang trống</div>`;
    } else {
      displayList.forEach((sess) => {
        const isActive = sess.id === roomData.activeSessionId;
        const stepStr = sess.finished ? 'Hoàn tất' : (sess.step ? `Bước ${sess.step}` : 'Đang xử lý');
        const qrUrl = `${window.location.origin}/download.html?branch=${encodeURIComponent(this.branch)}&room=${encodeURIComponent(this.activeRoom)}&session=${encodeURIComponent(sess.id)}`;
        
        html += `
          <div style="background: ${isActive ? 'var(--pl-bg-section)' : 'var(--pl-bg-panel)'}; border: 1px solid ${isActive ? 'var(--pl-accent)' : 'var(--pl-border)'}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; max-width: 48%;">
              <div style="font-weight: 600; color: var(--pl-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;" title="${sess.id}">
                ${sess.id}
              </div>
              <div style="font-size: 12px; color: var(--pl-text-muted);">
                ${stepStr} | ${sess.images ? sess.images.length : 0} ảnh
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0; align-items:center;">
              ${(!isActive && !sess.finished) ? `
                <button class="pl-btn" style="padding: 5px 10px; font-size: 12px; background: var(--pl-accent); color: #fff; border: none; font-weight: 600; cursor: pointer;" onclick="window.printApp._setActiveSession('${sess.id}')">
                  Chọn
                </button>
              ` : (isActive ? '<span style="font-size:11px; font-weight:bold; color:var(--pl-accent); padding:4px 6px;">ĐANG CHỌN</span>' : '')}
              <a href="${qrUrl}" target="_blank" class="pl-btn" style="padding: 5px 10px; font-size: 12px; background: var(--pl-bg-section); color: var(--pl-text); border: 1px solid var(--pl-border); font-weight: 500; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Xem QR code & Tải ảnh phiên này">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Xem QR / Ảnh
              </a>
              <button class="pl-btn" style="padding: 5px 10px; font-size: 12px; background: #ef4444; color: #fff; border: none; font-weight: 600; cursor: pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.printApp._deleteSessionFromQueue('${sess.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Xóa
              </button>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    const btnActive = document.getElementById('tabQueueActive');
    const btnFinished = document.getElementById('tabQueueFinished');
    if (btnActive) {
      btnActive.onclick = () => {
        this.queueTab = 'active';
        this._renderQueueModal();
      };
    }
    if (btnFinished) {
      btnFinished.onclick = () => {
        this.queueTab = 'finished';
        this._renderQueueModal();
      };
    }
  },

  async _setActiveSession(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      const res = await fetch(`/api/set-active-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        // Will receive active_session_changed via SSE
      }
    } catch (err) {
      console.error('Failed to set active session:', err);
    }
  },

  async _finishSessionFromQueue(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      await fetch(`/api/finish-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  },

  async _deleteSessionFromQueue(sessionId) {
    if (!confirm(`Bạn có chắc chắn muốn xóa phiên "${sessionId}" khỏi hàng chờ?`)) return;
    if (!this.activeRoom || !this.branch) return;
    try {
      await fetch(`/api/delete-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }
};
