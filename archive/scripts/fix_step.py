import sys

filepath = '/Users/hoji/Documents/code/mmephoto/js/print-layout.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_step_logic = """        roomData.session = active.id;
        roomData.step = active.step || 1;"""

new_step_logic = """        roomData.session = active.id;
        roomData.step = active.step || 1;
        
        // Smart step recovery based on data integrity:
        // If we have selected images, we must be at least at step 2 or 3
        if (active.selectedImages && active.selectedImages.length > 0) {
           if (roomData.step < 2) roomData.step = 3; 
        }
        // If we have slots filled, we must be at least at step 3 or 4
        if (active.slots && active.slots.some(s => s.imageId)) {
           if (roomData.step < 3) roomData.step = 4;
        }"""
content = content.replace(old_step_logic, new_step_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched print-layout.js smart step recovery")
