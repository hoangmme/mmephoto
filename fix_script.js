const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'data', 'roomState.json');
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch in data) {
    for (const room in data[branch]) {
      if (data[branch][room].sessions) {
         // Fix broken sessions by removing null slots so they don't crash
         data[branch][room].sessions.forEach(s => {
           if (s.slots && s.slots.some(slot => slot.imageId === null)) {
             s.slots = [];
             s.step = 1; // force them to restart
           }
         });
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log("Fixed roomState.json");
} else {
  console.log("No roomState.json found locally");
}
