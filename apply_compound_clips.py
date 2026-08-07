import json
import re

with open('compound_heart_clips.json') as f:
    clips_data = json.load(f)

with open('js/modules/pl-globals.js', 'r') as f:
    content = f.read()

# Update clipPath for a4-1 slots 0, 1, 2
for slot_idx, clip_val in clips_data['a4'].items():
    slot_id = f"slot_a4_{slot_idx}"
    pattern = rf'("id"\s*:\s*"{slot_id}".*?"clipPath"\s*:\s*")([^"]+)(")'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        print(f"Injecting compound clipPath for {slot_id} ({len(clip_val)} chars)")
        content = content[:match.start(2)] + clip_val + content[match.end(2):]

# Update clipPath for a5-1 slots 10, 11, 12
for slot_idx, clip_val in clips_data['a5'].items():
    slot_id = f"slot_a5_{slot_idx}"
    pattern = rf'("id"\s*:\s*"{slot_id}".*?"clipPath"\s*:\s*")([^"]+)(")'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        print(f"Injecting compound clipPath for {slot_id} ({len(clip_val)} chars)")
        content = content[:match.start(2)] + clip_val + content[match.end(2):]

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("Successfully injected compound heart clipPaths into js/modules/pl-globals.js!")
