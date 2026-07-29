import sys

filepath = '/Users/hoji/Documents/code/mmephoto/js/print-layout.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        // Force display block for swiper area and canvas
        const swiperArea = document.getElementById('mainSwiperArea');
        if (swiperArea) swiperArea.style.display = 'block';
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.opacity = '1';
            setTimeout(() => this._renderCanvas(), 500); // force draw after 500ms
        }"""

new_logic = """        // Force display block for canvas area and hide swiper
        const swiperArea = document.getElementById('mainSwiperArea');
        if (swiperArea) swiperArea.style.display = 'none';
        
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvasContainer) canvasContainer.style.display = 'flex';
        
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.opacity = '1';
            setTimeout(() => this._renderCanvas(), 500); // force draw after 500ms
        }"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched UI for step 4 in print-layout.js")
