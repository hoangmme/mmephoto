with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = """  let filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
  if (req.file && req.file.originalname && req.file.originalname.startsWith('00_frame')) {
    filename = req.file.originalname; // Preserve fixed frame names (00_frame_P1.png, 00_frame_P2.png) to overwrite on re-render
  }"""

new_logic = """  let filename = '';
  if (req.file && req.file.originalname) {
    # Preserve original filename (e.g. IMG_0001.jpg or 00_frame_P1.png) to prevent duplicate uploads
    filename = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9_\\-\\.]/g, '_');
  }
  if (!filename || filename === '_') {
    filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
  }"""

if old_logic in code:
    code = code.replace(old_logic, new_logic)
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully patched server.js filename deduplication logic!")
else:
    print("WARNING: Target code not found in server.js")

