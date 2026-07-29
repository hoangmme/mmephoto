import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove loginRoom input
content = content.replace('<input type="text" id="loginRoom" placeholder="Mã phòng (ROOM_01)" style="width:100%; padding:10px; margin-bottom:20px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">', '')
content = content.replace('<input type="password" id="loginPassword" placeholder="Mật khẩu" style="width:100%; padding:10px; margin-bottom:10px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">', '<input type="password" id="loginPassword" placeholder="Mật khẩu" style="width:100%; padding:10px; margin-bottom:20px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">')

# 2. Inject Tabs Container into pl-panel-left
tabs_html = """
        <div id="roomTabs" style="display:flex; flex-wrap:wrap; gap:5px; padding:10px 15px 0 15px; border-bottom:1px solid var(--pl-border);">
          <!-- Tabs will be generated here -->
        </div>
"""
if 'class="pl-panel-header"' in content:
    # insert before pl-panel-header
    content = content.replace('        <div class="pl-panel-header">', tabs_html + '\\n        <div class="pl-panel-header">')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched index.html for multi-room successfully.")
