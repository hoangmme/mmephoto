with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix null checks in server.js for sync-state slots
old_server_code = """  if (slots && Array.isArray(slots) && slots.length > 0) {
    const hasImages = slots.some(s => s.imageId);
    const hadImages = sessionObj.slots && sessionObj.slots.some(s => s.imageId);
    if (hasImages || !hadImages) {
      sessionObj.slots = slots;
    }
  }"""

new_server_code = """  if (slots && Array.isArray(slots) && slots.length > 0) {
    const hasImages = slots.some(s => s && s.imageId);
    const hadImages = sessionObj.slots && sessionObj.slots.some(s => s && s.imageId);
    if (hasImages || !hadImages) {
      sessionObj.slots = slots;
    }
  }"""

if old_server_code in content:
    content = content.replace(old_server_code, new_server_code)
    with open('server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched server.js null check for sync-state slots!")
else:
    print("WARNING: Target code not found in server.js")

with open('js/modules/pl-state.js', 'r', encoding='utf-8') as f:
    state_content = f.read()

old_state_code = """      const res = await fetch(`/api/sync-state/${encodeURIComponent(this.branch)}/${encodeURIComponent(room)}/${encodeURIComponent(roomData.session)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();"""

new_state_code = """      const res = await fetch(`/api/sync-state/${encodeURIComponent(this.branch)}/${encodeURIComponent(room)}/${encodeURIComponent(roomData.session)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`Sync-state endpoint returned ${res.status}:`, text);
        return null;
      }
      const data = await res.json();"""

if old_state_code in state_content:
    state_content = state_content.replace(old_state_code, new_state_code)
    with open('js/modules/pl-state.js', 'w', encoding='utf-8') as f:
        f.write(state_content)
    print("Successfully patched js/modules/pl-state.js with res.ok check!")
else:
    print("WARNING: Target code not found in js/modules/pl-state.js")

