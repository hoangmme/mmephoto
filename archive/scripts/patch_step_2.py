import re

with open('js/print-layout.js', 'r') as f:
    content = f.read()

# Add a safeguard in _updateUIForRoom to prevent step 4 with no photos
replacement = """
    let step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    
    // SAFEGUARD: If step is 4, but we have NO images in slots, we must be missing data. Revert to step 2 or 1.
    if (step === 4 && (!this.slots || !this.slots.some(s => s.imageId))) {
        console.warn("Safeguard triggered: step 4 but no slots filled! Reverting to step 1.");
        step = 1;
        if (this.activeRoom && this.rooms[this.activeRoom]) this.rooms[this.activeRoom].step = 1;
    }
    
    // SAFEGUARD 2: If step is 1, but we have images and we are supposed to be at step 4
    if (step === 1 && this.slots && this.slots.some(s => s.imageId)) {
        console.warn("Safeguard triggered: step 1 but slots are filled! Bumping to 4.");
        step = 4;
        if (this.activeRoom && this.rooms[this.activeRoom]) this.rooms[this.activeRoom].step = 4;
    }
    
    console.log("Updating UI for step:", step, "Room:", this.activeRoom);
"""
content = re.sub(r'let step = .*?\n.*?console\.log\("Updating UI.*?\n', replacement, content, flags=re.DOTALL)

with open('js/print-layout.js', 'w') as f:
    f.write(content)

