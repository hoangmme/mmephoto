with open('js/modules/pl-ui-steps.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = """        if (currentDraft) {
        this.selectedTemplates = [...(currentDraft.selectedTemplates || [])];
        if (this.selectedTemplates && this.selectedTemplates.length > 0) {
          this.currentTemplate = this.selectedTemplates[0];
        }
        this.paperSize = currentDraft.paperSize || this.paperSize;
        this.canvasesState = JSON.parse(JSON.stringify(currentDraft.canvasesState || []));
        this.selectedPhotos = new Set(currentDraft.selectedPhotos || []);
        if (currentDraft.activeCanvasIndex !== undefined && currentDraft.activeCanvasIndex !== null) {
          this.activeCanvasIndex = currentDraft.activeCanvasIndex;
        }
        const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
        if (this.canvasesState && this.canvasesState[activeIdx]) {
          this.slots = this.canvasesState[activeIdx].slots || [];
          if (this.canvasesState[activeIdx].templateId) {
            this.currentTemplate = this.canvasesState[activeIdx].templateId;
          }
        }
      } else if (roomData && roomData.queue && roomData.session) {
        // No draft exists yet: Load 100% of official Step 4 session data (submitted by User) into Staff draft
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess) {
          if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
            this.selectedTemplates = [...activeSess.selectedTemplates];
            this.currentTemplate = this.selectedTemplates[0];
          }
          if (activeSess.paperSize) this.paperSize = activeSess.paperSize;
          if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
            this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
          }
          if (activeSess.selectedImages) this.selectedPhotos = new Set(activeSess.selectedImages);
          
          const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
          if (this.canvasesState && this.canvasesState[activeIdx]) {
            this.slots = JSON.parse(JSON.stringify(this.canvasesState[activeIdx].slots || []));
            if (this.canvasesState[activeIdx].templateId) {
              this.currentTemplate = this.canvasesState[activeIdx].templateId;
            }
          } else if (activeSess.slots && activeSess.slots.length > 0) {
            this.slots = JSON.parse(JSON.stringify(activeSess.slots));
          }
          
          if (isStaffMode) {
            this._syncStaffDraftState();
          }
        }
      }"""

new_block = """        if (currentDraft && !isStaffMode) {
        this.selectedTemplates = [...(currentDraft.selectedTemplates || [])];
        if (this.selectedTemplates && this.selectedTemplates.length > 0) {
          this.currentTemplate = this.selectedTemplates[0];
        }
        this.paperSize = currentDraft.paperSize || this.paperSize;
        this.canvasesState = JSON.parse(JSON.stringify(currentDraft.canvasesState || []));
        this.selectedPhotos = new Set(currentDraft.selectedPhotos || []);
        if (currentDraft.activeCanvasIndex !== undefined && currentDraft.activeCanvasIndex !== null) {
          this.activeCanvasIndex = currentDraft.activeCanvasIndex;
        }
        const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
        if (this.canvasesState && this.canvasesState[activeIdx]) {
          this.slots = this.canvasesState[activeIdx].slots || [];
          if (this.canvasesState[activeIdx].templateId) {
            this.currentTemplate = this.canvasesState[activeIdx].templateId;
          }
        }
      } else if (roomData && roomData.queue && roomData.session) {
        // Staff mode (or user without draft): ALWAYS copy 100% of official Step 4 session data (submitted by User) into Staff draft
        const activeSess = roomData.queue.find(s => s.id === roomData.session);
        if (activeSess) {
          if (activeSess.selectedTemplates && activeSess.selectedTemplates.length > 0) {
            this.selectedTemplates = [...activeSess.selectedTemplates];
            this.currentTemplate = this.selectedTemplates[0];
          }
          if (activeSess.paperSize) this.paperSize = activeSess.paperSize;
          if (activeSess.canvasesState && activeSess.canvasesState.length > 0) {
            this.canvasesState = JSON.parse(JSON.stringify(activeSess.canvasesState));
          }
          if (activeSess.selectedImages) this.selectedPhotos = new Set(activeSess.selectedImages);
          
          const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
          if (this.canvasesState && this.canvasesState[activeIdx]) {
            this.slots = JSON.parse(JSON.stringify(this.canvasesState[activeIdx].slots || []));
            if (this.canvasesState[activeIdx].templateId) {
              this.currentTemplate = this.canvasesState[activeIdx].templateId;
            }
          } else if (activeSess.slots && activeSess.slots.length > 0) {
            this.slots = JSON.parse(JSON.stringify(activeSess.slots));
          }
          
          if (isStaffMode) {
            this._syncStaffDraftState();
          }
        }
      }"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('js/modules/pl-ui-steps.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully updated Staff draft loading logic: ALWAYS copy 100% of official Step 4 data into Staff draft!")
else:
    print("WARNING: old_block not found in pl-ui-steps.js")

