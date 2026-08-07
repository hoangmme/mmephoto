# 1. Update server.js download endpoint & autoCleanOldSessions default to 48 hours
with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

old_download_api = """app.get('/api/download/:branch/:room/:session', (req, res) => {
  const { branch, room, session } = req.params;
  const sessionDir = path.join(UPLOADS_DIR, branch, room, session);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const files = fs.readdirSync(sessionDir)
                  .filter(f => (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')) && !f.endsWith('_thumb.webp'));
                  
  const images = files.map(f => `/uploads/${branch}/${room}/${session}/${f}`);

  res.json({
    success: true,
    session,
    images
  });
});"""

new_download_api = """app.get('/api/download/:branch/:room/:session', (req, res) => {
  const { branch, room, session } = req.params;
  const sessionDir = path.join(UPLOADS_DIR, branch, room, session);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const allFiles = fs.readdirSync(sessionDir)
                     .filter(f => (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')) && !f.endsWith('_thumb.webp'));
                  
  const frameFiles = allFiles.filter(f => f.startsWith('00_frame')).sort();
  const photoFiles = allFiles.filter(f => !f.startsWith('00_frame')).sort();

  const frames = frameFiles.map(f => `/uploads/${branch}/${room}/${session}/${f}`);
  const photos = photoFiles.map(f => `/uploads/${branch}/${room}/${session}/${f}`);
  // Combined list with frames FIRST
  const images = [...frames, ...photos];

  res.json({
    success: true,
    session,
    images,
    frames,
    photos
  });
});"""

old_clean_default = "function autoCleanOldSessions(maxAgeHours = 24)"
new_clean_default = "function autoCleanOldSessions(maxAgeHours = 48)"

old_clean_interval = "autoCleanOldSessions(24);"
new_clean_interval = "autoCleanOldSessions(48);"

if old_download_api in server_code:
    server_code = server_code.replace(old_download_api, new_download_api)
    print("Patched server.js /api/download frames & photos separation!")

if old_clean_default in server_code:
    server_code = server_code.replace(old_clean_default, new_clean_default)
    server_code = server_code.replace(old_clean_interval, new_clean_interval)
    print("Patched server.js autoCleanOldSessions to 48 hours default!")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server_code)


# 2. Update download.html ZIP and photo list formatting
with open('download.html', 'r', encoding='utf-8') as f:
    dl_code = f.read()

old_zip_loop = """                for (let i = 0; i < data.images.length; i++) {
                  const url = data.images[i];
                  const ext = url.split('.').pop() || 'png';
                  const filename = `LL_Photobooth_${session}_P${i+1}_${Date.now().toString().slice(-4)}.${ext}`;
                  const response = await fetch(url);
                  if (!response.ok) throw new Error(`Lỗi tải ảnh #${i+1}`);
                  const blob = await response.blob();
                  zip.file(filename, blob);
                  btnDownloadZip.innerText = `Đang nén file (${Math.round(((i + 1) / data.images.length) * 100)}%)...`;
                }"""

new_zip_loop = """                const frames = data.frames || [];
                const photos = data.photos || [];
                let count = 0;
                const total = (frames.length + photos.length) || data.images.length;

                for (let i = 0; i < frames.length; i++) {
                  const url = frames[i];
                  const ext = url.split('.').pop().split('?')[0] || 'png';
                  const filename = `LL_FRAME_${session}_P${i+1}.${ext}`;
                  const response = await fetch(url);
                  if (response.ok) {
                    const blob = await response.blob();
                    zip.file(filename, blob);
                  }
                  count++;
                  btnDownloadZip.innerText = `Đang nén file (${Math.round((count / total) * 100)}%)...`;
                }

                for (let i = 0; i < photos.length; i++) {
                  const url = photos[i];
                  const ext = url.split('.').pop().split('?')[0] || 'jpg';
                  const filename = `LL_PHOTO_${session}_${i+1}.${ext}`;
                  const response = await fetch(url);
                  if (response.ok) {
                    const blob = await response.blob();
                    zip.file(filename, blob);
                  }
                  count++;
                  btnDownloadZip.innerText = `Đang nén file (${Math.round((count / total) * 100)}%)...`;
                }"""

if old_zip_loop in dl_code:
    dl_code = dl_code.replace(old_zip_loop, new_zip_loop)
    print("Patched download.html ZIP download with distinct FRAME & PHOTO filenames!")
else:
    print("WARNING: old_zip_loop not found in download.html")

with open('download.html', 'w', encoding='utf-8') as f:
    f.write(dl_code)

print("All patches for ZIP frames and 48h cleanup applied!")
