import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We will replace everything from "// NEW FLOW: Branch/Room Sync API" to "const roomState = {};"
start_idx = content.find('// NEW FLOW: Branch/Room Sync API')
end_idx = content.find('// state: { branchId: {')

if start_idx != -1 and end_idx != -1:
    admin_logic = """// NEW FLOW: Branch/Room Sync API
// ==========================================
const ADMIN_FILE = path.join(DATA_DIR, 'admin_data.json');
let ADMIN_DATA = {
  adminPass: "admin123",
  branches: {}
};

if (fs.existsSync(ADMIN_FILE)) {
  try {
    ADMIN_DATA = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
  } catch(e) { console.error('Error loading admin data:', e); }
} else {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(ADMIN_DATA, null, 2));
}

function saveAdminData() {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(ADMIN_DATA, null, 2));
}

function generateSetupCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// -- Admin APIs --
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
    ADMIN_DATA.branches[branchId] = { password, rooms: {} };
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
  
  const setupCode = generateSetupCode();
  ADMIN_DATA.branches[branchId].rooms[roomId] = setupCode;
  saveAdminData();
  res.json({ success: true, setupCode });
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
  if (ADMIN_DATA.branches[req.params.branch]) {
    delete ADMIN_DATA.branches[req.params.branch].rooms[req.params.room];
    saveAdminData();
  }
  res.json({ success: true });
});

// -- Sync Client API --
app.post('/api/setup-room', (req, res) => {
  const { setupCode } = req.body;
  if (!setupCode) return res.status(400).json({ error: 'Thiếu mã cài đặt' });
  
  let found = null;
  Object.keys(ADMIN_DATA.branches).forEach(bId => {
    Object.keys(ADMIN_DATA.branches[bId].rooms).forEach(rId => {
      if (ADMIN_DATA.branches[bId].rooms[rId] === setupCode) {
        found = { branchId: bId, roomId: rId, password: ADMIN_DATA.branches[bId].password };
      }
    });
  });
  
  if (found) {
    res.json({ success: true, ...found });
  } else {
    res.status(404).json({ error: 'Mã cài đặt không hợp lệ hoặc đã hết hạn' });
  }
});

"""
    content = content[:start_idx] + admin_logic + content[end_idx:]

    # Also update login logic
    content = content.replace("  if (BRANCHES[branchId] && BRANCHES[branchId] === password) {", "  if (ADMIN_DATA.branches[branchId] && ADMIN_DATA.branches[branchId].password === password) {")
    
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched server.js with Admin APIs successfully.")
else:
    print("Could not find insertion points in server.js")
