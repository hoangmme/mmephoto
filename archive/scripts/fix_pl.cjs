const fs = require('fs');
let content = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'utf8');
const lines = content.split('\n');
const newLines = lines.filter(line => !line.includes("import { ALL_TEMPLATES }"));
fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', newLines.join('\n'));
