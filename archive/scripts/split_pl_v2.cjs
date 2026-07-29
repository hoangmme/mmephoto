const fs = require('fs');
const content = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'utf8');
const lines = content.split('\n');

const stateMethods = ['_initSSE', '_syncState', '_updateActiveSession', '_handleNewImage', '_handleSessionFinished', '_updateQRCode', '_checkServerStatus', '_startStepTimer', '_startTimer', '_stopTimer', '_setStep'];
const uiMethods = ['_initApp', '_initMainSwiper', '_renderTabs', '_updateUIForRoom', '_selectSlide', '_initTemplate', '_renderImageList', '_updateImageListUI', '_setupUploadTest', '_setupKeyboardShortcuts'];
const canvasMethods = ['_renderCanvas', '_drawToCanvas', '_onCanvasClick', '_onPointerDown', '_onPointerMove', '_onPointerUp', '_setupCanvasEvents', '_assignToSlot', '_autoFill', '_exportJPG', '_exportPDF', '_print', '_showOverlay', '_uploadFinalFrame', '_preloadImage', '_loadTemplateImages', '_getDPI', '_mmToPx', '_pxToMm', '_isPointInRect'];

const allTargetMethods = [...stateMethods, ...uiMethods, ...canvasMethods];
const methods = {};

let currentMethod = null;
let currentMethodContent = [];
let openBrackets = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (!currentMethod) {
    // Look for method signature
    const match = line.match(/^[\s]*(async\s+)?([_a-zA-Z0-9]+)\s*\([^)]*\)\s*\{\s*$/);
    if (match) {
      const name = match[2];
      if (allTargetMethods.includes(name)) {
        currentMethod = name;
        currentMethodContent = [line];
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }
    }
  } else {
    currentMethodContent.push(line);
    // Count brackets, ignoring brackets in strings/comments is hard line-by-line,
    // but in print-layout.js it might be simple enough if formatted well.
    // Let's use a simple character loop for the line
    let inString = false, stringChar = '';
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (!inString) {
        if (char === '"' || char === "'" || char === '`') { inString = true; stringChar = char; }
        else if (char === '{') openBrackets++;
        else if (char === '}') openBrackets--;
      } else {
        if (char === '\\') c++;
        else if (char === stringChar) inString = false;
      }
    }
    
    if (openBrackets === 0) {
      methods[currentMethod] = currentMethodContent.join('\n');
      currentMethod = null;
    }
  }
}

console.log("Extracted: " + Object.keys(methods).length);
allTargetMethods.forEach(m => {
  if (!methods[m]) console.log("Missing: " + m);
});

function writeMixin(name, filename, targetMethods) {
  let out = `export const ${name} = {\n`;
  for (const m of targetMethods) {
    if (methods[m]) {
      // Remove the first line indentation if it's 2 spaces, but keep relative indentation
      const mLines = methods[m].split('\n');
      out += mLines.join('\n') + ',\n\n';
    }
  }
  out += '};\n';
  fs.writeFileSync(`/Users/hoji/Documents/code/mmephoto/js/modules/${filename}`, out);
}

writeMixin('StateMixin', 'pl-state.js', stateMethods);
writeMixin('UIMixin', 'pl-ui.js', uiMethods);
writeMixin('CanvasMixin', 'pl-canvas.js', canvasMethods);

