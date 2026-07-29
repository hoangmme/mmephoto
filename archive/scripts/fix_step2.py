import sys

filepath = '/Users/hoji/Documents/code/mmephoto/js/print-layout.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        // Only set step to 1 if we don't have a saved step from server
        if (roomData.images.length > 0 && !active.step) {
          this._setStep(room, 1);
        }"""

new_logic = """        // Only set step to 1 if we don't have a saved step from server AND smart recovery didn't bump the step
        if (roomData.images.length > 0 && !active.step && roomData.step === 1) {
          this._setStep(room, 1);
        }"""
content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched fallback logic in print-layout.js")
