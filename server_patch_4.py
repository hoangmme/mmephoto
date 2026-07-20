import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Admin Logic
start_idx = content.find('// -- Admin APIs --')
end_idx = content.find('app.post(\'/api/stream-upload')

if start_idx != -1 and end_idx != -1:
    admin_logic = """// -- Admin APIs --
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_DATA.adminPass) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Sai mật khẩu Admin' });
  }
});

app.get('/api/admin/data', (req, res) => {
  const { auth } = req.query;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  res.json(ADMIN_DATA);
});

app.post('/api/admin/branch', (req, res) => {
  const { auth, branchId, password } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  if (!branchId || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
  
  if (!ADMIN_DATA.branches[branchId]) {
    ADMIN_DATA.branches[branchId] = { 
      password, 
      setupCode: generateSetupCode() 
    };
  } else {
    ADMIN_DATA.branches[branchId].password = password;
  }
  saveAdminData();
  res.json({ success: true });
});

app.delete('/api/admin/branch/:id', (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_DATA.adminPass) return res.status(401).json({ error: 'Unauthorized' });
  delete ADMIN_DATA.branches[req.params.id];
  saveAdminData();
  res.json({ success: true });
});

// -- Sync Client API --
app.post('/api/setup-room', (req, res) => {
  const { setupCode } = req.body;
  if (!setupCode) return res.status(400).json({ error: 'Thiếu mã cài đặt' });
  
  let found = null;
  Object.keys(ADMIN_DATA.branches).forEach(bId => {
    if (ADMIN_DATA.branches[bId].setupCode === setupCode) {
      found = { branchId: bId, password: ADMIN_DATA.branches[bId].password };
    }
  });
  
  if (found) {
    res.json({ success: true, ...found });
  } else {
    res.status(404).json({ error: 'Mã cài đặt không hợp lệ hoặc đã hết hạn' });
  }
});

"""
    content = content[:start_idx] + admin_logic + content[end_idx:]

    # Update /api/login to handle CNADMIN
    login_old = """app.post('/api/login', (req, res) => {
  const { branchId, password } = req.body;
  if (ADMIN_DATA.branches[branchId] && ADMIN_DATA.branches[branchId].password === password) {
    res.json({ success: true, branchId });
  } else {
    res.status(401).json({ error: 'Sai ID hoặc Mật khẩu' });
  }
});"""
    login_new = """app.post('/api/login', (req, res) => {
  const { branchId, password } = req.body;
  if (branchId === 'CNADMIN' && password === ADMIN_DATA.adminPass) {
    return res.json({ success: true, isAdmin: true, auth: password });
  }
  if (ADMIN_DATA.branches[branchId] && ADMIN_DATA.branches[branchId].password === password) {
    res.json({ success: true, branchId });
  } else {
    res.status(401).json({ error: 'Sai ID hoặc Mật khẩu' });
  }
});"""
    content = content.replace(login_old, login_new)

    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched server.js for CNADMIN and Branch-level setup codes.")
else:
    print("Could not find insertion points in server.js")
