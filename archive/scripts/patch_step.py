import re

with open('js/print-layout.js', 'r') as f:
    content = f.read()

# Add a safeguard in _updateUIForRoom to prevent step 1 if slots are filled
replacement = """
    let step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;
    
    // SAFEGUARD: If step is 1, but we have images and we are supposed to be at step 4
    if (step === 1 && this.slots && this.slots.some(s => s.imageId)) {
        console.warn("Safeguard triggered: step 1 but slots are filled! Bumping to 4.");
        step = 4;
        if (this.activeRoom && this.rooms[this.activeRoom]) this.rooms[this.activeRoom].step = 4;
    }
    
    console.log("Updating UI for step:", step, "Room:", this.activeRoom);
"""
content = content.replace("const step = (this.activeRoom && this.rooms[this.activeRoom]) ? (this.rooms[this.activeRoom].step || 1) : 1;", replacement)

with open('js/print-layout.js', 'w') as f:
    f.write(content)

