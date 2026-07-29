import re

with open('admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('    function loadData(data) {')
end_idx = content.find('    checkAuth();')

if start_idx != -1 and end_idx != -1:
    admin_logic = """    function loadData(data) {
      const container = document.getElementById('branchesList');
      container.innerHTML = '';
      
      Object.keys(data.branches).forEach(bId => {
        const b = data.branches[bId];

        const card = document.createElement('div');
        card.className = 'branch-card';
        card.innerHTML = `
          <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin:0;">Chi nhánh: ${bId}</h3>
            <button class="danger" onclick="deleteBranch('${bId}')">Xoá Chi nhánh</button>
          </div>
          <div style="margin-bottom: 10px;">
            Mật khẩu Đăng nhập (trên Web): <strong>${b.password}</strong>
          </div>
          <div style="margin-bottom: 10px;">
            Mã Cài Đặt (cho PC): <span class="setup-code">${b.setupCode}</span>
          </div>
        `;
        container.appendChild(card);
      });
    }

    async function reloadData() {
      const res = await fetch('/api/admin/data?auth=' + adminAuth);
      if (res.ok) loadData(await res.json());
    }

    async function addBranch() {
      const id = document.getElementById('newBranchId').value;
      const pass = document.getElementById('newBranchPass').value;
      if(!id || !pass) return alert('Nhập đủ thông tin');
      await fetch('/api/admin/branch', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({auth: adminAuth, branchId: id, password: pass})
      });
      reloadData();
    }

    async function deleteBranch(id) {
      if(!confirm('Xoá chi nhánh ' + id + '?')) return;
      await fetch('/api/admin/branch/' + id, {
        method: 'DELETE', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({auth: adminAuth})
      });
      reloadData();
    }

"""
    content = content[:start_idx] + admin_logic + content[end_idx:]

    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched admin.html for Branch setup codes.")
else:
    print("Could not find insertion points in admin.html")
