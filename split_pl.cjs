const fs = require('fs');

const content = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'utf8');

const stateMethods = ['_initSSE', '_syncState', '_updateActiveSession', '_handleNewImage', '_handleSessionFinished', '_updateQRCode', '_checkServerStatus', '_startStepTimer', '_startTimer', '_stopTimer', '_setStep'];
const uiMethods = ['_initApp', '_initMainSwiper', '_renderTabs', '_updateUIForRoom', '_selectSlide', '_initTemplate', '_renderImageList', '_updateImageListUI', '_setupUploadTest', '_setupKeyboardShortcuts'];
const canvasMethods = ['_renderCanvas', '_drawToCanvas', '_onCanvasClick', '_onPointerDown', '_onPointerMove', '_onPointerUp', '_setupCanvasEvents', '_assignToSlot', '_autoFill', '_exportJPG', '_exportPDF', '_print', '_showOverlay', '_uploadFinalFrame', '_preloadImage', '_loadTemplateImages', '_getDPI', '_mmToPx', '_pxToMm', '_isPointInRect'];

const methods = {};

// We can just use a regex that matches `  name(...) {` and tracks brackets.
function extractMethods() {
  const methodRegex = /\n  (async\s+)?([_a-zA-Z0-9]+)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const isAsync = match[1] || '';
    const name = match[2];
    
    // We only care about the target methods
    if (![...stateMethods, ...uiMethods, ...canvasMethods].includes(name)) continue;

    const startIdx = match.index + 1; // start at the first space or 'a'
    let openBrackets = 0;
    let endIdx = -1;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inLineComment = false;

    // Start looking from the '{'
    const blockStart = content.indexOf('{', startIdx);
    
    for (let i = blockStart; i < content.length; i++) {
      const c = content[i];
      if (!inString && !inComment && !inLineComment) {
        if (c === '{') openBrackets++;
        else if (c === '}') {
          openBrackets--;
          if (openBrackets === 0) {
            endIdx = i + 1;
            break;
          }
        }
        else if (c === '"' || c === "'" || c === '`') {
          inString = true;
          stringChar = c;
        }
        else if (c === '/' && content[i+1] === '/') {
          inLineComment = true;
          i++;
        }
        else if (c === '/' && content[i+1] === '*') {
          inComment = true;
          i++;
        }
      } else if (inString) {
        if (c === '\\') i++;
        else if (c === stringChar) inString = false;
      } else if (inLineComment) {
        if (c === '\n') inLineComment = false;
      } else if (inComment) {
        if (c === '*' && content[i+1] === '/') {
          inComment = false;
          i++;
        }
      }
    }

    if (endIdx !== -1) {
      methods[name] = content.substring(startIdx, endIdx);
    }
  }
}

extractMethods();

console.log("Extracted methods: " + Object.keys(methods).length);

function writeMixin(name, filename, targetMethods) {
  let out = `export const ${name} = {\n`;
  for (const m of targetMethods) {
    if (methods[m]) {
      out += methods[m] + ',\n\n';
    } else {
      console.log(`Missing method: ${m}`);
    }
  }
  out += '};\n';
  fs.writeFileSync(`/Users/hoji/Documents/code/mmephoto/js/modules/${filename}`, out);
}

writeMixin('StateMixin', 'pl-state.js', stateMethods);
writeMixin('UIMixin', 'pl-ui.js', uiMethods);
writeMixin('CanvasMixin', 'pl-canvas.js', canvasMethods);

// Now generate the new print-layout.js
const classEndMatch = /\}\s*$/; // naive
const preamble = `import { ALL_TEMPLATES } from './presets.js';

import { StateMixin } from './modules/pl-state.js';
import { UIMixin } from './modules/pl-ui.js';
import { CanvasMixin } from './modules/pl-canvas.js';
import { QueueMixin } from './modules/pl-queue.js';

class PrintLayoutApp {
  constructor(branch) {
    this.branch = branch;
    this.activeRoom = null;
    this.rooms = {}; // state per room

    // Canvas & Swiper logic
    this.canvasScale = 1;
    this.pan = { x: 0, y: 0 };
    this.images = []; 
    this.selectedPhotos = new Set();
    this.currentTemplate = null; 
    
    // Core state
    this.slots = []; 
    this._imageCache = {}; 
    this.selectedSlotIndex = -1;

    // Interaction state
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.originalPan = { x: 0, y: 0 };
    this.pinchStartDist = 0;
    this.originalZoom = 1;

    this._initApp();
  }
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

fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', preamble);
console.log("Done");
