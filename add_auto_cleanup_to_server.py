with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

cleanup_function = """
// Auto cleanup session files older than maxAgeHours (default 24 hours)
function autoCleanOldSessions(maxAgeHours = 24) {
  if (!fs.existsSync(UPLOADS_DIR)) return 0;
  let deletedCount = 0;
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  try {
    const branches = fs.readdirSync(UPLOADS_DIR);
    branches.forEach(b => {
      const bPath = path.join(UPLOADS_DIR, b);
      if (!fs.statSync(bPath).isDirectory()) return;
      const rooms = fs.readdirSync(bPath);
      rooms.forEach(r => {
        const rPath = path.join(bPath, r);
        if (!fs.statSync(rPath).isDirectory()) return;
        const sessions = fs.readdirSync(rPath);
        sessions.forEach(s => {
          const sPath = path.join(rPath, s);
          if (!fs.statSync(sPath).isDirectory()) return;
          try {
            const stat = fs.statSync(sPath);
            if (now - stat.mtimeMs > maxAgeMs) {
              fs.rmSync(sPath, { recursive: true, force: true });
              deletedCount++;
              console.log(`[CLEANUP] Deleted old session folder (> ${maxAgeHours}h): ${sPath}`);
            }
          } catch (err) {
            console.error(`[CLEANUP ERROR] Failed to delete ${sPath}:`, err);
          }
        });
      });
    });

    // Also clean roomState sessions array
    Object.keys(roomState).forEach(b => {
      Object.keys(roomState[b]).forEach(r => {
        if (roomState[b][r] && Array.isArray(roomState[b][r].sessions)) {
          roomState[b][r].sessions = roomState[b][r].sessions.filter(sess => {
            const sessDir = path.join(UPLOADS_DIR, b, r, sess.id);
            return fs.existsSync(sessDir);
          });
        }
      });
    });
    saveRoomState();
  } catch (err) {
    console.error('[CLEANUP EXCEPTION]:', err);
  }
  return deletedCount;
}

// Run auto cleanup every 6 hours automatically
setInterval(() => {
  autoCleanOldSessions(24);
}, 6 * 60 * 60 * 1000);
"""

endpoint_code = """
// Admin API to clean old session files manually (default older than 24h, or maxAgeHours param)
app.post('/api/admin/clean-old-files', (req, res) => {
  const hours = parseInt(req.body.hours) || 24;
  const deleted = autoCleanOldSessions(hours);
  res.json({ success: true, deletedSessions: deleted, message: `Successfully deleted sessions older than ${hours} hours` });
});
"""

if 'function autoCleanOldSessions' not in code:
    # Insert cleanup_function right after scanDiskSessions()
    idx = code.find('scanDiskSessions();')
    if idx != -1:
        code = code[:idx+19] + '\n' + cleanup_function + '\n' + code[idx+19:]
        code += '\n' + endpoint_code
        with open('server.js', 'w', encoding='utf-8') as f:
            f.write(code)
        print("Successfully added autoCleanOldSessions & API route to server.js!")
    else:
        print("WARNING: scanDiskSessions(); not found in server.js")

