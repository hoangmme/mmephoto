import json

# Read clipPaths
with open('heart_clips.json') as f:
    clips = json.load(f)

# Read pl-globals.js
with open('js/modules/pl-globals.js', 'r') as f:
    content = f.read()

# Add clipPath to each heart slot
import re

def add_clippath_to_slot(content, slot_id, clip_path):
    """Add clipPath property to a slot definition."""
    # Find the slot block
    # Pattern: "id": "slot_id" ... "rotation": N
    # We need to add "clipPath": "..." after "rotation"
    
    # Find the slot by its id
    pattern = rf'("id":\s*"{slot_id}".*?"rotation":\s*[\d.]+)'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"  Could not find {slot_id}")
        return content
    
    # Check if clipPath already exists
    end_pos = match.end()
    next_chars = content[end_pos:end_pos+50]
    if 'clipPath' in next_chars:
        print(f"  {slot_id}: clipPath already exists, skipping")
        return content
    
    # Insert clipPath after rotation value
    insert_text = f',\n                        "clipPath": "{clip_path}"'
    content = content[:end_pos] + insert_text + content[end_pos:]
    print(f"  Added clipPath to {slot_id} ({len(clip_path)} chars)")
    return content

# A4 template hearts (slots 0, 1, 2)
for slot_num, clip in clips['a4'].items():
    content = add_clippath_to_slot(content, f"slot_a4_{slot_num}", clip)

# A5 template hearts (slots 10, 11, 12)
for slot_num, clip in clips['a5'].items():
    content = add_clippath_to_slot(content, f"slot_a5_{slot_num}", clip)

# Write back
with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("\nDone! Updated pl-globals.js with heart clipPaths")
