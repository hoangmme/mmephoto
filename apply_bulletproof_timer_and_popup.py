# 1. Update pl-state.js _startStepTimer
with open('js/modules/pl-state.js', 'r', encoding='utf-8') as f:
    state_code = f.read()

old_timer_calc = """    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    const updateTimeLeft = () => {
      let effectiveStart = null;
      if (roomData.lastImageTime) {
        effectiveStart = roomData.lastImageTime + 30000;
      } else if (activeSess && activeSess.sessionStartedAt) {
        effectiveStart = activeSess.sessionStartedAt + 30000;
      }

      if (effectiveStart) {
        if (Date.now() < effectiveStart) {
          // Trong vòng 30s kể từ khi có ảnh mới tải lên, giữ nguyên 7:00 (chưa đếm giây)
          roomData.timeLeft = duration;
        } else {
          // Đã trôi qua 30s không có ảnh mới -> bắt đầu đếm lùi giây từ 07:00
          const elapsed = Math.floor((Date.now() - effectiveStart) / 1000);
          roomData.timeLeft = Math.max(0, duration - elapsed);
        }
      } else {
        roomData.timeLeft = duration;
      }
    };"""

new_timer_calc = """    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    const updateTimeLeft = () => {
      if (activeSess && activeSess.sessionStartedAt) {
        const elapsed = Math.floor((Date.now() - activeSess.sessionStartedAt) / 1000);
        roomData.timeLeft = Math.max(0, duration - elapsed);
      } else {
        roomData.timeLeft = duration;
      }
    };"""

if old_timer_calc in state_code:
    state_code = state_code.replace(old_timer_calc, new_timer_calc)
    print("Patched pl-state.js clean timer calculation!")
else:
    print("WARNING: old_timer_calc not found in pl-state.js")

with open('js/modules/pl-state.js', 'w', encoding='utf-8') as f:
    f.write(state_code)


# 2. Update pl-ui-steps.js to force Pop-up display when sessionStartedAt is null
with open('js/modules/pl-ui-steps.js', 'r', encoding='utf-8') as f:
    steps_code = f.read()

old_popup_check = """    const currentRoomD = (this.activeRoom && this.rooms[this.activeRoom]) ? this.rooms[this.activeRoom] : null;"""

new_popup_check = """    const currentRoomD = (this.activeRoom && this.rooms[this.activeRoom]) ? this.rooms[this.activeRoom] : null;
    if (!isStaffMode && currentRoomD && currentRoomD.session) {
      const activeSess = (currentRoomD.queue || []).find(s => s.id === currentRoomD.session);
      const startOverlay = document.getElementById('startSessionOverlay');
      if (startOverlay) {
        if (!activeSess || !activeSess.sessionStartedAt) {
          startOverlay.classList.remove('dismissed');
          startOverlay.style.display = 'flex';
        } else {
          startOverlay.style.display = 'none';
        }
      }
    }"""

if old_popup_check in steps_code:
    steps_code = steps_code.replace(old_popup_check, new_popup_check, 1)
    with open('js/modules/pl-ui-steps.js', 'w', encoding='utf-8') as f:
        f.write(steps_code)
    print("Patched pl-ui-steps.js reliable Pop-up display logic!")
else:
    print("WARNING: old_popup_check not found in pl-ui-steps.js")

