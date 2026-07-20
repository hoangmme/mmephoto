import re

with open('js/print-layout.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('      const res = await fetch(\'/api/login\', {')
end_idx = content.find('      } else {', start_idx)

if start_idx != -1 and end_idx != -1:
    old_logic = """      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branchId: branch, password: pass})
      });
      
      if (res.ok) {
        localStorage.setItem('branchId', branch);
        if(loginOverlay) loginOverlay.style.display = 'none';
        this._initSSE(branch);"""
    
    new_logic = """      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branchId: branch, password: pass})
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.isAdmin) {
          localStorage.setItem('adminAuth', data.auth);
          window.location.href = '/admin.html';
          return;
        }
        localStorage.setItem('branchId', branch);
        if(loginOverlay) loginOverlay.style.display = 'none';
        this._initSSE(branch);"""
        
    content = content.replace(old_logic, new_logic)
    
    with open('js/print-layout.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched js/print-layout.js for CNADMIN redirect successfully.")
else:
    print("Could not find insertion points in js/print-layout.js")
