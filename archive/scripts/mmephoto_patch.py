import sys

filepath = '/Users/hoji/Documents/code/mmephoto/js/print-layout.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Stop validIds cleanup from wiping data
old_cleanup = """
          // Clean up invalid IDs from previous algorithm
          const validIds = new Set(roomData.images.map(img => img.id));
          this.selectedPhotos = new Set(Array.from(this.selectedPhotos).filter(id => validIds.has(id)));
          if (this.slots) {
            this.slots.forEach(slot => {
              if (slot && slot.imageId && !validIds.has(slot.imageId)) {
                slot.imageId = null;
              }
            });
          }
"""

new_cleanup = """
          // We will NOT wipe slot data based on validIds because it causes F5 data loss
          // if the server state and client state are momentarily out of sync.
          // Keep selectedPhotos and slots as they came from the server.
"""
content = content.replace(old_cleanup, new_cleanup)


# Fix 2: Make sure _initTemplate doesn't wipe slots unexpectedly
old_init_template = """    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    
    this.slots = tmpl.slots.map((s, i) => ({
      imageId: (oldSlots[i] && (oldSlots.length === tmpl.slots.length || step > 1)) ? oldSlots[i].imageId : null,"""

new_init_template = """    const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    
    this.slots = tmpl.slots.map((s, i) => ({
      imageId: (oldSlots[i] && oldSlots[i].imageId) ? oldSlots[i].imageId : null,"""
content = content.replace(old_init_template, new_init_template)

# Fix 3: Force printCanvas to be visible and draw again when step 4 is reached
old_step4 = """      } else if (step === 4) {
        instructionText.textContent = isStaffMode ? '✨ Vui lòng kiểm tra lại bố cục, tải ảnh layout và nhận khách tiếp theo.' : '✨ Xin chúc mừng bạn đã hoàn thành, xin vui lòng đợi nhân viên kiểm tra và in ảnh nhé';"""

new_step4 = """      } else if (step === 4) {
        instructionText.textContent = isStaffMode ? '✨ Vui lòng kiểm tra lại bố cục, tải ảnh layout và nhận khách tiếp theo.' : '✨ Xin chúc mừng bạn đã hoàn thành, xin vui lòng đợi nhân viên kiểm tra và in ảnh nhé';
        
        // Force display block for swiper area and canvas
        const swiperArea = document.getElementById('mainSwiperArea');
        if (swiperArea) swiperArea.style.display = 'block';
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.opacity = '1';
            setTimeout(() => this._renderCanvas(), 500); // force draw after 500ms
        }
"""
content = content.replace(old_step4, new_step4)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched print-layout.js")
