import re

with open('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'r') as f:
    content = f.read()

class_start = content.find('class PrintLayoutApp {')
constructor_end = content.find('  _initSSE() {', class_start)
if constructor_end == -1:
    constructor_end = content.find('  _initApp() {', class_start)

def extract_methods(content, start_idx):
    methods = {}
    current_idx = start_idx
    while True:
        match = re.search(r'\n  (?:async )?([a-zA-Z0-9_]+)\([^)]*\) {', content[current_idx:])
        if not match:
            break
        
        method_name = match.group(1)
        method_start = current_idx + match.start() + 1
        
        open_brackets = 0
        method_end = -1
        in_string = False
        string_char = ''
        in_comment = False
        in_line_comment = False
        
        i = method_start
        while i < len(content):
            c = content[i]
            if not in_string and not in_comment and not in_line_comment:
                if c == '{':
                    open_brackets += 1
                elif c == '}':
                    open_brackets -= 1
                    if open_brackets == 0:
                        method_end = i + 1
                        break
                elif c == '"' or c == "'" or c == '`':
                    in_string = True
                    string_char = c
                elif c == '/' and i+1 < len(content):
                    if content[i+1] == '/':
                        in_line_comment = True
                        i += 1
                    elif content[i+1] == '*':
                        in_comment = True
                        i += 1
            elif in_string:
                if c == '\\':
                    i += 1
                elif c == string_char:
                    in_string = False
            elif in_line_comment:
                if c == '\n':
                    in_line_comment = False
            elif in_comment:
                if c == '*' and i+1 < len(content) and content[i+1] == '/':
                    in_comment = False
                    i += 1
            i += 1
            
        if method_end != -1:
            methods[method_name] = content[method_start:method_end]
            current_idx = method_end
        else:
            break
    return methods

methods = extract_methods(content, constructor_end)
print("Extracted methods:", len(methods))

state_methods = [
    '_initSSE', '_updateActiveSession', '_syncState', '_startStepTimer', 
    '_startTimer', '_stopTimer', '_updateQRCode'
]
ui_methods = [
    '_initLogin', '_initApp', '_initMainSwiper', '_renderTabs', '_updateUIForRoom', 
    '_setStep', '_selectSlide', '_bindEvents', '_loadBatch', '_handleTimeout', 
    '_openDB', '_initTemplate', '_renderImageList', '_updateImageListUI', 
    '_uploadTestImages', '_selectAll', '_deselectAll', '_handleImageUpload', 
    '_importTemplateJson'
]
canvas_methods = [
    '_preloadImage', '_loadTemplateImages', '_onCanvasClick', '_assignToSlot', 
    '_autoFill', '_panSlot', '_zoomSlot', '_resetCrop', '_removeFromSlot', 
    '_clampPan', '_calcCover', '_renderSlotProps', '_renderCanvas', '_drawToCanvas', 
    '_drawImageInSlot', '_exportJPG', '_uploadFinalFrame', '_exportPDF', 
    '_print', '_showOverlay'
]

def write_mixin(filename, name, method_names):
    with open(f'/Users/hoji/Documents/code/mmephoto/js/modules/{filename}', 'w') as f:
        f.write(f'export const {name} = {{\n')
        for m in method_names:
            if m in methods:
                lines = methods[m].split('\n')
                # Adjust indent slightly if needed, but original is fine
                f.write(methods[m] + ',\n\n')
            else:
                print(f"Missing {m}")
        f.write('};\n')

write_mixin('pl-state.js', 'StateMixin', state_methods)
write_mixin('pl-ui.js', 'UIMixin', ui_methods)
write_mixin('pl-canvas.js', 'CanvasMixin', canvas_methods)

# Now, we need to rebuild print-layout.js
# Get everything up to the first extracted method
new_class = content[:constructor_end] + "\n}\n"
# Remove trailing spaces
new_class = new_class.strip() + "\n"

preamble = """import { ALL_TEMPLATES } from './presets.js';

import { StateMixin } from './modules/pl-state.js';
import { UIMixin } from './modules/pl-ui.js';
import { CanvasMixin } from './modules/pl-canvas.js';
import { QueueMixin } from './modules/pl-queue.js';

"""

postamble = """
Object.assign(PrintLayoutApp.prototype, StateMixin, UIMixin, CanvasMixin, QueueMixin);

window.addEventListener('DOMContentLoaded', () => {
  const b = localStorage.getItem('branchId');
  if (b) {
    window.printApp = new PrintLayoutApp(b);
  } else {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }
});
"""

with open('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'w') as f:
    # We must remove the existing DOMContentLoaded block from new_class if it got included
    # Actually, the original file has it at the end. constructor_end is inside the class.
    # We need to replace the class content
    final_content = preamble + new_class.replace("import { ALL_TEMPLATES } from './presets.js';", "").strip() + "\n" + postamble
    f.write(final_content)

print("Done")
