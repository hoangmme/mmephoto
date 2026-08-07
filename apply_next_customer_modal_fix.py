# 1. Update server.js
with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

old_server_finish = """    const remainingUnfinished = roomD.sessions.filter(s => !s.finished);
    if (remainingUnfinished.length > 0) {
      roomD.activeSessionId = remainingUnfinished[0].id;
      remainingUnfinished[0].step = 1;
    }"""

new_server_finish = """    const remainingUnfinished = roomD.sessions.filter(s => !s.finished);
    if (remainingUnfinished.length > 0) {
      roomD.activeSessionId = remainingUnfinished[0].id;
      remainingUnfinished[0].step = 1;
      remainingUnfinished[0].sessionStartedAt = null;
    }"""

if old_server_finish in server_code:
    server_code = server_code.replace(old_server_finish, new_server_finish)
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(server_code)
    print("Patched server.js finish-session sessionStartedAt reset!")

# 2. Update pl-ui-core.js
with open('js/modules/pl-ui-core.js', 'r', encoding='utf-8') as f:
    core_code = f.read()

old_next_handler = """      const lockOverlay = document.getElementById('lockOverlay');
      if (lockOverlay) lockOverlay.style.display = 'none';
      if (r && this.rooms[r]) {
        this.rooms[r].session = this.rooms[r].activeSessionId || null;
        this.rooms[r].step = 1;
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
      }"""

new_next_handler = """      const lockOverlay = document.getElementById('lockOverlay');
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
      }"""

if old_next_handler in core_code:
    core_code = core_code.replace(old_next_handler, new_next_handler)
    with open('js/modules/pl-ui-core.js', 'w', encoding='utf-8') as f:
        f.write(core_code)
    print("Patched pl-ui-core.js handleNextCustomer start overlay logic!")
else:
    print("WARNING: old_next_handler not found in pl-ui-core.js")

