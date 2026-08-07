import re

# 1. Update print-layout.css
with open('print-layout.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

start_css_old = """/* ── Start Session Overlay (Click to start 7-min countdown) ── */
.pl-start-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999998;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.pl-start-overlay img {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  transition: transform 0.2s ease;
}"""

start_css_new = """/* ── Start Session Overlay (Click to start 7-min countdown) ── */
.pl-start-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999998;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: none;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}

.pl-start-card {
  background: linear-gradient(135deg, rgba(30, 24, 18, 0.95), rgba(15, 12, 10, 0.98));
  border: 1px solid rgba(245, 158, 11, 0.4);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.15);
  border-radius: 20px;
  padding: 44px 36px;
  width: 480px;
  max-width: 90vw;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: plStartCardPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes plStartCardPop {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.pl-start-icon {
  font-size: 48px;
  margin-bottom: 16px;
  line-height: 1;
  filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.5));
}

.pl-start-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
  text-transform: uppercase;
}

.pl-start-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin: 0 0 28px 0;
}

.pl-start-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  border: none;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
  transition: all 0.2s ease;
  width: 100%;
  max-width: 280px;
}

.pl-start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.6);
  background: linear-gradient(135deg, #fbbf24, #d97706);
}

.pl-start-btn:active {
  transform: translateY(1px);
}"""

if start_css_old in css_content:
    css_content = css_content.replace(start_css_old, start_css_new)
    with open('print-layout.css', 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("Patched print-layout.css for pl-start-card!")
else:
    print("WARNING: start_css_old not found in print-layout.css")


# 2. Update pl-queue.js
with open('js/modules/pl-queue.js', 'r', encoding='utf-8') as f:
    queue_code = f.read()

old_set_active = """  async _setActiveSession(sessionId) {
    if (!this.activeRoom || !this.branch) return;
    try {
      const res = await fetch(`/api/set-active-session/${encodeURIComponent(this.branch)}/${encodeURIComponent(this.activeRoom)}/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (res.ok) {
        if (this.rooms[this.activeRoom]) {
          const roomData = this.rooms[this.activeRoom];
          roomData.activeSessionId = sessionId;
          this._updateActiveSession(this.activeRoom);
          roomData.sessionStarted = false; roomData.timerStarted = false;
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

old_reset_timer = """          this.sessionStarted = false;
          const startOverlay = document.getElementById('startSessionOverlay');
          if (startOverlay) startOverlay.classList.remove('dismissed');

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

          this._setActiveSession(sessionId);
          this._setStep(this.activeRoom, 1);
          this._updateUIForRoom();
          this._renderCanvas();
          if (this._renderQueueModal) this._renderQueueModal();"""

new_reset_timer = """          const queueOverlay = document.getElementById('queueModalOverlay');
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
          if (this._renderQueueModal) this._renderQueueModal();"""

if old_set_active in queue_code:
    queue_code = queue_code.replace(old_set_active, new_set_active)
    print("Patched pl-queue.js _setActiveSession logic!")
else:
    print("WARNING: old_set_active not found in pl-queue.js")

if old_reset_timer in queue_code:
    queue_code = queue_code.replace(old_reset_timer, new_reset_timer)
    print("Patched pl-queue.js _resetSessionTimer logic!")
else:
    print("WARNING: old_reset_timer not found in pl-queue.js")

with open('js/modules/pl-queue.js', 'w', encoding='utf-8') as f:
    f.write(queue_code)


# 3. Update pl-ui-interactions.js for lock screen reset timer button
with open('js/modules/pl-ui-interactions.js', 'r', encoding='utf-8') as f:
    inter_code = f.read()

old_lock_reset = """      btnLockResetTimer.addEventListener('click', () => {
        const roomData = this.rooms[this.activeRoom];
        if (roomData) {
          roomData.sessionStarted = false;
          const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
          if (activeSess) {
            activeSess.sessionStartedAt = null;
          }
          if (roomData.session && this._resetSessionTimer) {
            this._resetSessionTimer(roomData.session);
          } else {
            this._setStep(this.activeRoom, 1);
            this._updateUIForRoom();
          }
        }
      });"""

new_lock_reset = """      btnLockResetTimer.addEventListener('click', () => {
        const roomData = this.rooms[this.activeRoom];
        if (roomData && roomData.session) {
          const lockOverlay = document.getElementById('lockOverlay');
          if (lockOverlay) lockOverlay.style.display = 'none';
          this._resetSessionTimer(roomData.session);
        }
      });"""

if old_lock_reset in inter_code:
    inter_code = inter_code.replace(old_lock_reset, new_lock_reset)
    with open('js/modules/pl-ui-interactions.js', 'w', encoding='utf-8') as f:
        f.write(inter_code)
    print("Patched pl-ui-interactions.js btnLockResetTimer logic!")

print("All start modal & queue fixes applied!")
