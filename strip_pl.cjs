const fs = require('fs');
let content = fs.readFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', 'utf8');
const startIdx = content.indexOf('const A5_WIDTH = 1748;');
const endIdx = content.indexOf('const ALL_TEMPLATES = { ...parsedDefaults };') + 'const ALL_TEMPLATES = { ...parsedDefaults };'.length;
content = content.substring(0, startIdx) + "import { ALL_TEMPLATES, customTemplates, isStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './modules/pl-globals.js';\n" + content.substring(endIdx);
fs.writeFileSync('/Users/hoji/Documents/code/mmephoto/js/print-layout.js', content);
