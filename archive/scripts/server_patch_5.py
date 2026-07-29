import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('app.post(\'/api/admin/branch\', (req, res) => {')
end_idx = content.find('app.post(\'/api/setup-room\', (req, res) => {')

if start_idx != -1 and end_idx != -1:
    admin_logic = """app.post('/api/admin/branch', (req, res) => {
  const { auth, branchId, password } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (!branchId || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
  
  if (!ADMIN_DATA.branches[branchId]) {
    ADMIN_DATA.branches[branchId] = { 
      password, 
      setupCode: generateSetupCode(),
      rooms: []
    };
  } else {
    ADMIN_DATA.branches[branchId].password = password;
  }
  saveAdminData();
  res.json({ success: true });
});

app.post('/api/admin/room', (req, res) => {
  const { auth, branchId, roomId } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (!branchId || !roomId) return res.status(400).json({ error: 'Thiếu thông tin' });
  
  if (!ADMIN_DATA.branches[branchId]) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
  
  if (!ADMIN_DATA.branches[branchId].rooms) {
    ADMIN_DATA.branches[branchId].rooms = [];
  }
  if (!ADMIN_DATA.branches[branchId].rooms.includes(roomId)) {
    ADMIN_DATA.branches[branchId].rooms.push(roomId);
    saveAdminData();
  }
  res.json({ success: true });
});

app.delete('/api/admin/branch/:id', (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  delete ADMIN_DATA.branches[req.params.id];
  saveAdminData();
  res.json({ success: true });
});

app.delete('/api/admin/room/:branch/:room', (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (ADMIN_DATA.branches[req.params.branch] && ADMIN_DATA.branches[req.params.branch].rooms) {
    ADMIN_DATA.branches[req.params.branch].rooms = ADMIN_DATA.branches[req.params.branch].rooms.filter(r => r !== req.params.room);
    saveAdminData();
  }
  res.json({ success: true });
});

// -- Sync Client API --
"""
    content = content[:start_idx] + admin_logic + content[end_idx:]
    
    # Also update /api/setup-room to return the rooms array
    setup_old = """  if (found) {
    res.json({ success: true, ...found });
  } else {"""
    setup_new = """  if (found) {
    // Make sure rooms exists
    if (!ADMIN_DATA.branches[found.branchId].rooms) {
      ADMIN_DATA.branches[found.branchId].rooms = [];
    }
    res.json({ success: true, ...found, rooms: ADMIN_DATA.branches[found.branchId].rooms });
  } else {"""
    content = content.replace(setup_old, setup_new)

    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched server.js for Admin Room APIs.")
else:
    print("Could not find insertion points in server.js")
