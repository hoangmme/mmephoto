const fs = require('fs');

function fix(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  // the script did `out += methods[m] + ',\n\n';`
  // We can just replace `,\n\n` with `\n,\n\n` if it follows a comment?
  // Easier: re-run the node script but change `out += methods[m] + ',\n\n';` to `out += methods[m] + '\n,\n\n';`
}
