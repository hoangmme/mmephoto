import re

with open('print-layout.html', 'r', encoding='utf-8') as f:
    content = f.read()

overlays = """
  <!-- LOGIN OVERLAY -->
  <div id="loginOverlay" style="position:fixed; inset:0; background:var(--pl-bg); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column;">
    <div style="background:var(--pl-bg-panel); padding:30px; border-radius:12px; border:1px solid var(--pl-border); width:320px; text-align:center;">
      <h2 style="margin-bottom:20px; color:var(--pl-text);">Đăng Nhập</h2>
      <input type="text" id="loginBranch" placeholder="Mã chi nhánh (CN01)" style="width:100%; padding:10px; margin-bottom:10px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">
      <input type="password" id="loginPassword" placeholder="Mật khẩu" style="width:100%; padding:10px; margin-bottom:10px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">
      <input type="text" id="loginRoom" placeholder="Mã phòng (ROOM_01)" style="width:100%; padding:10px; margin-bottom:20px; border-radius:6px; border:1px solid var(--pl-border); background:var(--pl-bg-section); color:var(--pl-text);">
      <button id="btnLoginSubmit" class="pl-btn pl-btn-primary" style="width:100%; justify-content:center; font-size:16px;">Vào Phòng</button>
      <div id="loginError" style="color:#ef4444; margin-top:10px; display:none; font-size:14px;">Sai thông tin</div>
    </div>
  </div>

  <!-- LOCK OVERLAY -->
  <div id="lockOverlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9998; display:none; align-items:center; justify-content:center; flex-direction:column; text-align:center;">
    <h1 style="color:#ef4444; font-size:32px; margin-bottom:10px;">HẾT THỜI GIAN THAO TÁC</h1>
    <p style="color:#fff; font-size:18px;">Vui lòng đưa iPad cho nhân viên hỗ trợ in ảnh.</p>
    <button id="btnUnlock" style="margin-top:40px; padding:10px 20px; background:transparent; border:1px solid #444; color:#666; border-radius:6px; cursor:pointer;">Mở khóa (Nhân viên)</button>
  </div>
  
  <!-- QR CODE OVERLAY -->
  <div id="qrOverlay" style="position:fixed; bottom:20px; left:20px; background:#fff; padding:10px; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.3); z-index:50; display:none; text-align:center;">
    <canvas id="qrCanvas" width="120" height="120"></canvas>
    <div style="font-size:12px; color:#000; margin-top:5px; font-weight:bold;">Quét để tải ảnh</div>
  </div>
"""

# Insert overlays before </body>
content = content.replace("</body>", overlays + "\\n</body>")

# Insert Next Customer button in header-right
next_btn = """
        <button class="pl-btn" id="btnNextCustomer" title="Nhận Khách Tiếp Theo" style="display:none; border-color:var(--pl-accent); color:var(--pl-accent);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Next Customer
        </button>
"""
if 'id="btnExportJPG"' in content:
    content = content.replace('<button class="pl-btn" id="btnExportJPG"', next_btn + '\\n        <button class="pl-btn" id="btnExportJPG"')

with open('print-layout.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched print-layout.html successfully.")
