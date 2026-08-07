# 1. Patch server.js for frameImages
with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

old_stream_push = """  if (!filename.startsWith('00_frame') && !sessionObj.images.includes(imageUrl)) {
    sessionObj.images.push(imageUrl);
  }"""

new_stream_push = """  if (filename.startsWith('00_frame')) {
    if (!sessionObj.frameImages) sessionObj.frameImages = [];
    if (!sessionObj.frameImages.includes(imageUrl)) {
      sessionObj.frameImages.push(imageUrl);
    }
  } else {
    if (!sessionObj.images.includes(imageUrl)) {
      sessionObj.images.push(imageUrl);
    }
  }"""

old_scan_disk = """          const images = getAllImagesRecursive(sPath, `/uploads/${encodeURIComponent(b)}/${encodeURIComponent(r)}/${encodeURIComponent(s)}`);
          
          let sessObj = roomState[branchKey][roomKey].sessions.find(x => x.id.toLowerCase() === s.toLowerCase());
          if (!sessObj) {
            sessObj = {
              id: s,
              images: images,
              finished: true,
              step: 4
            };"""

new_scan_disk = """          const allFiles = getAllImagesRecursive(sPath, `/uploads/${encodeURIComponent(b)}/${encodeURIComponent(r)}/${encodeURIComponent(s)}`);
          const images = allFiles.filter(img => !img.includes('/00_frame'));
          const frameImages = allFiles.filter(img => img.includes('/00_frame'));
          
          let sessObj = roomState[branchKey][roomKey].sessions.find(x => x.id.toLowerCase() === s.toLowerCase());
          if (!sessObj) {
            sessObj = {
              id: s,
              images: images,
              frameImages: frameImages,
              finished: true,
              step: 4
            };
          } else {
            sessObj.frameImages = frameImages;
          }"""

if old_stream_push in server_code:
    server_code = server_code.replace(old_stream_push, new_stream_push)
    print("Patched server.js stream-upload frameImages storage!")

if old_scan_disk in server_code:
    server_code = server_code.replace(old_scan_disk, new_scan_disk)
    print("Patched server.js scanDiskSessions frameImages storage!")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server_code)


# 2. Patch pl-state.js for frameImages
with open('js/modules/pl-state.js', 'r', encoding='utf-8') as f:
    state_code = f.read()

old_state_payload = """        payload.slots = activeSess.slots || [];
        if (activeSess.sessionStartedAt) {
          payload.sessionStartedAt = activeSess.sessionStartedAt;
        }"""

new_state_payload = """        payload.slots = activeSess.slots || [];
        if (activeSess.frameImages) {
          payload.frameImages = activeSess.frameImages;
        }
        if (activeSess.sessionStartedAt) {
          payload.sessionStartedAt = activeSess.sessionStartedAt;
        }"""

if old_state_payload in state_code:
    state_code = state_code.replace(old_state_payload, new_state_payload)
    print("Patched pl-state.js frameImages payload sync!")

with open('js/modules/pl-state.js', 'w', encoding='utf-8') as f:
    f.write(state_code)

