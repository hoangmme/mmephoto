const fs = require('fs');

const filename = '/Users/hoji/Documents/code/mmephoto/js/modules/pl-canvas.js';
let content = fs.readFileSync(filename, 'utf8');

const overlayStart = content.indexOf('_showOverlay(show) {');
const overlayFixed = `_showOverlay(show) {
    this.exportOverlay.classList.toggle('visible', show);
  }`;

// Remove everything from _showOverlay(show) { to the end, and replace with overlayFixed
content = content.substring(0, overlayStart) + overlayFixed + ',\n\n};\n';

fs.writeFileSync(filename, content);
