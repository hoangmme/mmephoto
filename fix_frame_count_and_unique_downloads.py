import re

# 1. Patch server.js
with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

old_filename_logic = """  const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
  const filepath = path.join(sessionDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);"""

new_filename_logic = """  let filename = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
  if (req.file && req.file.originalname && req.file.originalname.startsWith('00_frame')) {
    filename = req.file.originalname; // Preserve fixed frame names (00_frame_P1.png, 00_frame_P2.png) to overwrite on re-render
  }
  const filepath = path.join(sessionDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);"""

old_images_push = """  if (!sessionObj.images.includes(imageUrl)) {
    sessionObj.images.push(imageUrl);
  }"""

new_images_push = """  if (!filename.startsWith('00_frame') && !sessionObj.images.includes(imageUrl)) {
    sessionObj.images.push(imageUrl);
  }"""

if old_filename_logic in server_code:
    server_code = server_code.replace(old_filename_logic, new_filename_logic)
    print("Patched server.js filename logic for 00_frame!")

if old_images_push in server_code:
    server_code = server_code.replace(old_images_push, new_images_push)
    print("Patched server.js sessionObj.images push logic!")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server_code)


# 2. Patch CanvasExporter.js
with open('js/components/CanvasExporter.js', 'r', encoding='utf-8') as f:
    exporter_code = f.read()

old_export_templates = """      const templatesToExport = appInstance.selectedTemplates && appInstance.selectedTemplates.length > 0 
        ? appInstance.selectedTemplates 
        : [appInstance.currentTemplate];"""

new_export_templates = """      const maxFrames = (appInstance.paperSize === 'A4') ? 1 : 2;
      const rawTemplates = (appInstance.selectedTemplates && appInstance.selectedTemplates.length > 0)
        ? appInstance.selectedTemplates 
        : [appInstance.currentTemplate];
      const templatesToExport = rawTemplates.slice(0, maxFrames);"""

if old_export_templates in exporter_code:
    exporter_code = exporter_code.replace(old_export_templates, new_export_templates)
    print("Patched CanvasExporter.js maxFrames limit (A4=1, A5=2)!")

with open('js/components/CanvasExporter.js', 'w', encoding='utf-8') as f:
    f.write(exporter_code)


# 3. Patch download.html
with open('download.html', 'r', encoding='utf-8') as f:
    dl_code = f.read()

old_zip_name = """                  const filename = url.split('/').pop();"""
new_zip_name = """                  const ext = url.split('.').pop() || 'png';
                  const filename = `LL_Photobooth_${session}_P${i+1}_${Date.now().toString().slice(-4)}.${ext}`;"""

if old_zip_name in dl_code:
    dl_code = dl_code.replace(old_zip_name, new_zip_name)
    print("Patched download.html unique ZIP filenames!")

with open('download.html', 'w', encoding='utf-8') as f:
    f.write(dl_code)

print("All patches applied successfully!")
