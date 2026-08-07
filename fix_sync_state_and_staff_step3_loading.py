with open('js/modules/pl-state.js', 'r', encoding='utf-8') as f:
    state_code = f.read()

old_sync_direct_head = """    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    if (activeSess) {
      activeSess.step = roomData.step;
    }

    try {
      const payload = {
        clientId: this.clientId,
        step: roomData.step
      };

      if (activeSess) {
        payload.currentTemplate = activeSess.currentTemplate || '1photo';
        payload.selectedTemplates = activeSess.selectedTemplates || ['1photo'];
        payload.paperSize = activeSess.paperSize || 'A4';
        payload.canvasesState = activeSess.canvasesState || [];
        payload.selectedImages = activeSess.selectedImages || [];
        payload.slots = activeSess.slots || [];
        if (activeSess.sessionStartedAt) {
          payload.sessionStartedAt = activeSess.sessionStartedAt;
        }
      }"""

new_sync_direct_head = """    const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
    if (activeSess) {
      activeSess.step = roomData.step;
      if (this.activeRoom === room) {
        if (this.currentTemplate) activeSess.currentTemplate = this.currentTemplate;
        if (this.selectedTemplates && this.selectedTemplates.length > 0) activeSess.selectedTemplates = this.selectedTemplates;
        if (this.paperSize) activeSess.paperSize = this.paperSize;
        if (this.slots && this.slots.length > 0) activeSess.slots = JSON.parse(JSON.stringify(this.slots));
        if (this.canvasesState && this.canvasesState.length > 0) activeSess.canvasesState = JSON.parse(JSON.stringify(this.canvasesState));
        if (this.selectedPhotos) activeSess.selectedImages = Array.from(this.selectedPhotos);
      }
    }

    try {
      const payload = {
        clientId: this.clientId,
        step: roomData.step
      };

      if (activeSess) {
        payload.currentTemplate = activeSess.currentTemplate || '1photo';
        payload.selectedTemplates = activeSess.selectedTemplates || ['1photo'];
        payload.paperSize = activeSess.paperSize || 'A4';
        payload.canvasesState = activeSess.canvasesState || [];
        payload.selectedImages = activeSess.selectedImages || [];
        payload.slots = activeSess.slots || [];
        if (activeSess.sessionStartedAt) {
          payload.sessionStartedAt = activeSess.sessionStartedAt;
        }
      }"""

if old_sync_direct_head in state_code:
    state_code = state_code.replace(old_sync_direct_head, new_sync_direct_head)
    print("Patched pl-state.js _syncStateDirect instance-to-activeSess sync!")
else:
    print("WARNING: old_sync_direct_head not found in pl-state.js")

with open('js/modules/pl-state.js', 'w', encoding='utf-8') as f:
    f.write(state_code)

# 2. Update pl-ui-steps.js to force sync before step 4
with open('js/modules/pl-ui-steps.js', 'r', encoding='utf-8') as f:
    steps_code = f.read()

old_set_step_tail = """    roomData.step = step;
    this._startStepTimer(room, step);
    if (this.activeRoom === room) {
      this._updateUIForRoom();
      this._renderCanvas();
    }
    if (!skipSync) {
      this._syncState(room);
    }"""

new_set_step_tail = """    roomData.step = step;
    this._startStepTimer(room, step);
    if (this.activeRoom === room) {
      this._updateUIForRoom();
      this._renderCanvas();
    }
    if (!skipSync) {
      this._syncStateDirect(room);
    }"""

if old_set_step_tail in steps_code:
    steps_code = steps_code.replace(old_set_step_tail, new_set_step_tail)
    with open('js/modules/pl-ui-steps.js', 'w', encoding='utf-8') as f:
        f.write(steps_code)
    print("Patched pl-ui-steps.js direct sync on step change!")
else:
    print("WARNING: old_set_step_tail not found in pl-ui-steps.js")

