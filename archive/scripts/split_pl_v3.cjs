const fs = require('fs');

const content = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'utf8');

// Find the start of the class body
const classStart = content.indexOf('class PrintLayoutApp {');
const firstMethodMatch = content.match(/\n\s+(async\s+)?constructor\s*\(/);
const firstMethodIndex = firstMethodMatch.index;

const preamble = content.substring(0, classStart);
const classBodyAndBeyond = content.substring(firstMethodIndex + 1);

// We know methods are separated by newlines and start with 2 spaces.
// A regex to find the start of any method:
const methodRegex = /\n  (async\s+)?([_a-zA-Z0-9]+)\s*\([^)]*\)\s*\{/g;
const methodStarts = [];
let match;
while ((match = methodRegex.exec('\n' + classBodyAndBeyond)) !== null) {
  methodStarts.push({
    name: match[2],
    index: match.index // index in classBodyAndBeyond
  });
}

const methods = {};
for (let i = 0; i < methodStarts.length; i++) {
  const current = methodStarts[i];
  const next = methodStarts[i+1];
  
  let methodBody = '';
  if (next) {
    methodBody = classBodyAndBeyond.substring(current.index, next.index);
  } else {
    // For the last method, it goes until the closing brace of the class
    const lastPart = classBodyAndBeyond.substring(current.index);
    const lastBraceIdx = lastPart.lastIndexOf('}');
    methodBody = lastPart.substring(0, lastBraceIdx);
  }
  
  methods[current.name] = methodBody.trim();
}

console.log("Found methods:", Object.keys(methods).length);

const stateMethods = ['_initSSE', '_updateActiveSession', '_syncState', '_startStepTimer', '_startTimer', '_stopTimer', '_updateQRCode'];
const uiMethods = ['_initLogin', '_initApp', '_initMainSwiper', '_renderTabs', '_updateUIForRoom', '_setStep', '_selectSlide', '_bindEvents', '_loadBatch', '_handleTimeout', '_openDB', '_initTemplate', '_renderImageList', '_updateImageListUI', '_uploadTestImages', '_selectAll', '_deselectAll', '_handleImageUpload', '_importTemplateJson'];
const canvasMethods = ['_preloadImage', '_loadTemplateImages', '_onCanvasClick', '_assignToSlot', '_autoFill', '_panSlot', '_zoomSlot', '_resetCrop', '_removeFromSlot', '_clampPan', '_calcCover', '_renderSlotProps', '_renderCanvas', '_drawToCanvas', '_drawImageInSlot', '_exportJPG', '_uploadFinalFrame', '_exportPDF', '_print', '_showOverlay'];

function writeMixin(name, filename, targetMethods) {
  let out = `export const ${name} = {\n`;
  for (const m of targetMethods) {
    if (methods[m]) {
      out += methods[m] + '\n,\n\n';
    } else {
      console.log("Missing method: " + m);
    }
  }
  out += '};\n';
  fs.writeFileSync(`/Users/hoji/Documents/code/mmephoto/js/modules/${filename}`, out);
}

writeMixin('StateMixin', 'pl-state.js', stateMethods);
writeMixin('UIMixin', 'pl-ui.js', uiMethods);
writeMixin('CanvasMixin', 'pl-canvas.js', canvasMethods);

// Modify _updateActiveSession logic for activeSessionId
let plStateContent = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/modules/pl-state.js', 'utf8');
plStateContent = plStateContent.replace(
  "const active = roomData.queue[0];",
  "const activeSessionId = roomData.activeSessionId;\n      const active = roomData.queue.find(s => s.id === activeSessionId) || roomData.queue[0];"
);
fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/modules/pl-state.js', plStateContent);

// Modify _initSSE for active_session_changed
plStateContent = plStateContent.replace(
  "if (data.type === 'new_image') {",
  "if (data.type === 'active_session_changed') {\n          if (this.rooms[data.room]) {\n            this.rooms[data.room].activeSessionId = data.session;\n            this._updateActiveSession(data.room);\n            if (this.activeRoom === data.room) this._updateUIForRoom();\n            if (this._renderQueueModal) this._renderQueueModal();\n          }\n        } else if (data.type === 'new_image') {"
);
// Also update init payload parsing
plStateContent = plStateContent.replace(
  "this.rooms[room].queue = data.sessions || [];",
  "this.rooms[room].queue = data.sessions || [];\n        if (data.activeSessionId) this.rooms[room].activeSessionId = data.activeSessionId;"
);
fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/modules/pl-state.js', plStateContent);

// Generate print-layout.js
const newClass = `
class PrintLayoutApp {
  ${methods['constructor']}
}

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
`;

let finalFile = preamble.replace("import { ALL_TEMPLATES } from './presets.js';", "") + `
import { ALL_TEMPLATES } from './presets.js';
import { StateMixin } from './modules/pl-state.js';
import { UIMixin } from './modules/pl-ui.js';
import { CanvasMixin } from './modules/pl-canvas.js';
import { QueueMixin } from './modules/pl-queue.js';
` + newClass;

fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', finalFile);
console.log("Refactoring complete");
