const fs = require('fs');
const content = fs.readFileSync('js/print-layout.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('.step =')) {
    console.log(`${i + 1}: ${line}`);
  }
});
