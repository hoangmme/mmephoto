import re

def fix_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    for old_str, new_str in replacements:
        if old_str in content:
            content = content.replace(old_str, new_str)
            modified = True
            print(f"Patched {filepath}: replaced '{old_str[:40]}...'")
        else:
            print(f"WARNING: Target string not found in {filepath}: '{old_str[:40]}...'")
            
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# 1. pl-ui-media.js
fix_file('js/modules/pl-ui-media.js', [
    (
        "const usedIds = new Set(this.slots.filter(s => s.imageId).map(s => s.imageId));",
        "const usedIds = new Set((this.slots || []).filter(s => s && s.imageId).map(s => s.imageId));"
    )
])

# 2. pl-canvas.js
fix_file('js/modules/pl-canvas.js', [
    (
        "return cState.slots.every(slot => !slot.imageId);",
        "return cState.slots.every(slot => !slot || !slot.imageId);"
    ),
    (
        "if (!slot.imageId) {",
        "if (!slot || !slot.imageId) {"
    )
])

# 3. pl-state.js
fix_file('js/modules/pl-state.js', [
    (
        "const serverHasImages = data.slots.some(s => s.imageId);",
        "const serverHasImages = data.slots && data.slots.some(s => s && s.imageId);"
    ),
    (
        "const localHasImages = sessionObj.slots && sessionObj.slots.some(s => s.imageId);",
        "const localHasImages = sessionObj.slots && sessionObj.slots.some(s => s && s.imageId);"
    ),
    (
        "const serverHasImages = data.slots.some(s => s.imageId);",
        "const serverHasImages = data.slots && data.slots.some(s => s && s.imageId);"
    ),
    (
        "const localHasImages = this.slots && this.slots.some(s => s.imageId);",
        "const localHasImages = this.slots && this.slots.some(s => s && s.imageId);"
    )
])

# 4. pl-ui-steps.js
fix_file('js/modules/pl-ui-steps.js', [
    (
        "if (!this.slots || !this.slots.some(s => s.imageId)) {",
        "if (!this.slots || !this.slots.some(s => s && s.imageId)) {"
    )
])

