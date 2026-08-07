with open('js/modules/pl-state.js', 'r', encoding='utf-8') as f:
    state_code = f.read()

old_state_staff_block = """          const blockOverwrite = isStaffMode && this._staffEditingOverride;
          const isUserStep1 = !isStaffMode && (roomData.step || 1) === 1;
          
          if (blockOverwrite || isUserStep1) {
            // Staff editing or User at Step 1: preserve local state completely
          } else {
            if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
              this.currentTemplate = active.currentTemplate;
            } else if (this.currentTemplate && ALL_TEMPLATES[this.currentTemplate]) {
              active.currentTemplate = this.currentTemplate;
            } else {
              this.currentTemplate = Object.keys(ALL_TEMPLATES)[0];
              active.currentTemplate = this.currentTemplate;
            }

            if (active.selectedTemplates && active.selectedTemplates.length > 0) {
              this.selectedTemplates = active.selectedTemplates;
            }

            if (active.paperSize) {
              this.paperSize = active.paperSize;
            }

            if (active.canvasesState && active.canvasesState.length > 0) {
              this.canvasesState = JSON.parse(JSON.stringify(active.canvasesState));
            } else {
              this.canvasesState = [];
            }
          }

          if (isStaffMode) {
            if (blockOverwrite) {
              // Staff editing: preserve ALL local data, do NOT load from active session
            } else {
              // Staff at Step 4 or first load: load data from active session
              const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
              if (this.canvasesState && this.canvasesState[activeIdx]) {
                this.slots = JSON.parse(JSON.stringify(this.canvasesState[activeIdx].slots || []));
              } else if (active.slots && active.slots.length > 0) {
                this.slots = JSON.parse(JSON.stringify(active.slots));
              }
              if (active.selectedImages) {
                this.selectedPhotos = new Set(active.selectedImages);
              }
            }
          }"""

new_state_staff_block = """          const isUserStep1 = !isStaffMode && (roomData.step || 1) === 1;
          const hasLocalSlots = this.slots && this.slots.length > 0 && this.slots.some(s => s && s.imageId);

          if (isStaffMode) {
            // Staff Mode: If local slots are empty or Staff navigated back to edit steps, load customer session data
            if (!hasLocalSlots && active) {
              if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
                this.currentTemplate = active.currentTemplate;
              }
              if (active.selectedTemplates && active.selectedTemplates.length > 0) {
                this.selectedTemplates = active.selectedTemplates;
              }
              if (active.paperSize) {
                this.paperSize = active.paperSize;
              }
              if (active.canvasesState && active.canvasesState.length > 0) {
                this.canvasesState = JSON.parse(JSON.stringify(active.canvasesState));
              }
              if (active.slots && active.slots.length > 0) {
                this.slots = JSON.parse(JSON.stringify(active.slots));
              } else {
                const activeIdx = (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0;
                if (this.canvasesState && this.canvasesState[activeIdx] && this.canvasesState[activeIdx].slots) {
                  this.slots = JSON.parse(JSON.stringify(this.canvasesState[activeIdx].slots));
                }
              }
              if (active.selectedImages) {
                this.selectedPhotos = new Set(active.selectedImages);
              }
            }
          } else if (!isUserStep1) {
            if (active.currentTemplate && ALL_TEMPLATES[active.currentTemplate]) {
              this.currentTemplate = active.currentTemplate;
            }
            if (active.selectedTemplates && active.selectedTemplates.length > 0) {
              this.selectedTemplates = active.selectedTemplates;
            }
            if (active.paperSize) {
              this.paperSize = active.paperSize;
            }
            if (active.canvasesState && active.canvasesState.length > 0) {
              this.canvasesState = JSON.parse(JSON.stringify(active.canvasesState));
            }
          }"""

if old_state_staff_block in state_code:
    state_code = state_code.replace(old_state_staff_block, new_state_staff_block)
    with open('js/modules/pl-state.js', 'w', encoding='utf-8') as f:
        f.write(state_code)
    print("Successfully patched pl-state.js for Staff step3 data load!")
else:
    print("WARNING: old_state_staff_block not found in pl-state.js")

