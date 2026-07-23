const fs = require('fs');
const state = JSON.parse(fs.readFileSync('./data/room_state.json', 'utf8'));
console.log(JSON.stringify(state, null, 2));
