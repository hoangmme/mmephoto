import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace notify SSE clients in stream-upload
upload_old = """  // Notify SSE clients
  const roomKey = `${branch}_${room}`;
  if (clients[roomKey]) {
    clients[roomKey].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'new_image', session, imageUrl })}\\n\\n`);
    });
  }"""
upload_new = """  // Notify SSE clients
  if (clients[branch]) {
    clients[branch].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'new_image', room, session, imageUrl })}\\n\\n`);
    });
  }"""
content = content.replace(upload_old, upload_new)

# Replace notify SSE clients in next-session
next_old = """  const roomKey = `${branch}_${room}`;
  if (clients[roomKey]) {
    clients[roomKey].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'reset' })}\\n\\n`);
    });
  }"""
next_new = """  if (clients[branch]) {
    clients[branch].forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'reset', room })}\\n\\n`);
    });
  }"""
content = content.replace(next_old, next_new)

# Replace stream endpoint
stream_old = """app.get('/api/stream/:branch/:room', (req, res) => {
  const { branch, room } = req.params;
  const roomKey = `${branch}_${room}`;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  if (!clients[roomKey]) clients[roomKey] = [];
  clients[roomKey].push(res);
  
  // Send current state immediately
  if (roomState[branch] && roomState[branch][room] && roomState[branch][room].session) {
     res.write(`data: ${JSON.stringify({ 
       type: 'init', 
       session: roomState[branch][room].session, 
       images: roomState[branch][room].images 
     })}\\n\\n`);
  }
  
  req.on('close', () => {
    clients[roomKey] = clients[roomKey].filter(c => c !== res);
  });
});"""
stream_new = """app.get('/api/stream/:branch', (req, res) => {
  const { branch } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  if (!clients[branch]) clients[branch] = [];
  clients[branch].push(res);
  
  // Send current state immediately for ALL rooms in this branch
  if (roomState[branch]) {
    Object.keys(roomState[branch]).forEach(room => {
      if (roomState[branch][room].session) {
         res.write(`data: ${JSON.stringify({ 
           type: 'init', 
           room: room,
           session: roomState[branch][room].session, 
           images: roomState[branch][room].images 
         })}\\n\\n`);
      }
    });
  }
  
  req.on('close', () => {
    clients[branch] = clients[branch].filter(c => c !== res);
  });
});"""
content = content.replace(stream_old, stream_new)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.js for multi-room SSE successfully.")
