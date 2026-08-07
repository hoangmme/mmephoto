with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = """          let sessObj = roomState[branchKey][roomKey].sessions.find(x => x.id.toLowerCase() === s.toLowerCase());
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
          }
            roomState[branchKey][roomKey].sessions.push(sessObj);
          } else {
            if (!sessObj.images || sessObj.images.length === 0) {
              sessObj.images = images;
            }
          }"""

new_block = """          let sessObj = roomState[branchKey][roomKey].sessions.find(x => x.id.toLowerCase() === s.toLowerCase());
          if (!sessObj) {
            sessObj = {
              id: s,
              images: images,
              frameImages: frameImages,
              finished: true,
              step: 4
            };
            roomState[branchKey][roomKey].sessions.push(sessObj);
          } else {
            sessObj.frameImages = frameImages;
            if (!sessObj.images || sessObj.images.length === 0) {
              sessObj.images = images;
            }
          }"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully fixed server.js scanDiskSessions block syntax!")
else:
    print("WARNING: old_block not found in server.js")

