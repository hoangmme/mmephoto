# 1. Update pl-queue.js
with open('js/modules/pl-queue.js', 'r', encoding='utf-8') as f:
    queue_code = f.read()

old_set_active = """  async _setActiveSession(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      const res = await fetch(`/api/set-active-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        const queueOverlay = document.getElementById('queueModalOverlay');
        if (queueOverlay) queueOverlay.style.display = 'none';

        if (this.rooms[this.activeRoom]) {
          const roomData = this.rooms[this.activeRoom];
          roomData.activeSessionId = sessionId;
          roomData.session = sessionId;
          this._updateActiveSession(this.activeRoom);
          
          const activeSess = (roomData.queue || []).find(s => s.id === sessionId);
          if (!activeSess || !activeSess.sessionStartedAt) {
            roomData.step = 1;
            roomData.locked = false;
            roomData.sessionStarted = false;
            const startOverlay = document.getElementById('startSessionOverlay');
            if (startOverlay) {
              startOverlay.classList.remove('dismissed');
              startOverlay.style.display = 'flex';
            }
            const lockOverlay = document.getElementById('lockOverlay');
            if (lockOverlay) lockOverlay.style.display = 'none';
          }
          this._updateUIForRoom();
          if (this._renderQueueModal) this._renderQueueModal();
        }
      }
    } catch (err) {
      console.error('Failed to set active session:', err);
    }
  },"""

new_set_active = """  async _setActiveSession(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      const res = await fetch(`/api/set-active-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to set active session:', err);
    }
  },"""

old_reset_timer = """  async _resetSessionTimer(sessionId) {
    if (!confirm(`Bạn có chắc chắn muốn reset lại 7 phút thời gian chọn cho phiên "${sessionId}"?`)) return;
    if (!this.activeRoom || !this.branch) return;

    try {
      const res = await fetch(`/api/reset-session-timer/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
          const queueOverlay = document.getElementById('queueModalOverlay');
          if (queueOverlay) queueOverlay.style.display = 'none';

          const lockOverlay = document.getElementById('lockOverlay');
          if (lockOverlay) lockOverlay.style.display = 'none';

          const startOverlay = document.getElementById('startSessionOverlay');
          if (startOverlay) {
            startOverlay.classList.remove('dismissed');
            startOverlay.style.display = 'flex';
          }

          const roomData = this.rooms[this.activeRoom];
          roomData.activeSessionId = sessionId;
          roomData.session = sessionId;
          roomData.step = 1;
          roomData.locked = false;
          roomData.timeLeft = 420;
          roomData.sessionStarted = false;
          if (roomData.timedOutSteps) roomData.timedOutSteps.clear();

          const sessObj = (roomData.queue || []).find(s => s.id === sessionId);
          if (sessObj) {
            sessObj.finished = false;
            sessObj.step = 1;
            sessObj.sessionStartedAt = null;
          }

          this._setStep(this.activeRoom, 1);
          this._updateUIForRoom();
          this._renderCanvas();
          if (this._renderQueueModal) this._renderQueueModal();
      }
    } catch (err) {
      console.error('Failed to reset session timer:', err);
    }
  },"""

new_reset_timer = """  async _resetSessionTimer(sessionId) {
    if (!confirm(`Bạn có chắc chắn muốn reset lại 7 phút thời gian chọn cho phiên "${sessionId}"?`)) return;
    if (!this.activeRoom || !this.branch) return;

    try {
      const res = await fetch(`/api/reset-session-timer/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to reset session timer:', err);
    }
  },"""

if old_set_active in queue_code:
    queue_code = queue_code.replace(old_set_active, new_set_active)
    print("Patched pl-queue.js _setActiveSession reload!")

if old_reset_timer in queue_code:
    queue_code = queue_code.replace(old_reset_timer, new_reset_timer)
    print("Patched pl-queue.js _resetSessionTimer reload!")

with open('js/modules/pl-queue.js', 'w', encoding='utf-8') as f:
    f.write(queue_code)


# 2. Update pl-ui-core.js
with open('js/modules/pl-ui-core.js', 'r', encoding='utf-8') as f:
    core_code = f.read()

old_handle_next = """    const handleNextCustomer = async () => {
      if (!confirm('Chuyển qua lượt khách hàng tiếp theo? (Phiên hiện tại sẽ được đánh dấu hoàn thành)')) return;
      const b = localStorage.getItem('branchId') || 'CN01';
      const r = this.activeRoom;
      if (b && r && this.rooms[r]) {
        const sessId = this.rooms[r].session || this.rooms[r].activeSessionId;
        if (sessId) {
          try {
            const res = await fetch(`/api/finish-session/${b}/${r}/${encodeURIComponent(sessId)}`, { method: 'POST' });
            if (res.ok) {
              const data = await res.json();
              this.rooms[r].activeSessionId = data.activeSessionId || null;
            }
          } catch (err) { console.error(err); }
        }
      }
      const lockOverlay = document.getElementById('lockOverlay');
      if (lockOverlay) lockOverlay.style.display = 'none';

      const startOverlay = document.getElementById('startSessionOverlay');
      if (startOverlay) {
        startOverlay.classList.remove('dismissed');
        startOverlay.style.display = 'flex';
      }

      if (r && this.rooms[r]) {
        this.rooms[r].session = this.rooms[r].activeSessionId || null;
        this.rooms[r].step = 1;
        this.rooms[r].locked = false;
        this.rooms[r].sessionStarted = false;
        this.rooms[r].timerStarted = false;
        this.currentStep = 1;
        this._staffEditingOverride = false;
        this.slots = [];
        this.selectedPhotos = new Set();
        this.canvasesState = null;

        this._stopTimer(r);
        this._updateActiveSession(r);
        this._updateUIForRoom();
        this._renderCanvas();
        this._renderTabs();
      }
    };"""

new_handle_next = """    const handleNextCustomer = async () => {
      if (!confirm('Chuyển qua lượt khách hàng tiếp theo? (Phiên hiện tại sẽ được đánh dấu hoàn thành)')) return;
      const b = localStorage.getItem('branchId') || 'CN01';
      const r = this.activeRoom;
      if (b && r && this.rooms[r]) {
        const sessId = this.rooms[r].session || this.rooms[r].activeSessionId;
        if (sessId) {
          try {
            const res = await fetch(`/api/finish-session/${b}/${r}/${encodeURIComponent(sessId)}`, { method: 'POST' });
            if (res.ok) {
              window.location.reload();
              return;
            }
          } catch (err) { console.error(err); }
        }
      }
      window.location.reload();
    };"""

if old_handle_next in core_code:
    core_code = core_code.replace(old_handle_next, new_handle_next)
    with open('js/modules/pl-ui-core.js', 'w', encoding='utf-8') as f:
        f.write(core_code)
    print("Patched pl-ui-core.js handleNextCustomer reload!")
else:
    print("WARNING: old_handle_next not found in pl-ui-core.js")

