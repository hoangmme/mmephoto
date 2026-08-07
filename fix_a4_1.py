filepath = 'js/modules/pl-globals.js'
with open(filepath, 'r') as f:
    content = f.read()

import re
# Find slot_a4_1 block and replace rotation: -90 with rotation: 0
pattern = r'("id": "slot_a4_1",\s*"color": "#ff3131",\s*"cx": 1107.5,\s*"cy": 279.0,\s*"w": 229,\s*"h": 184,\s*"rotation":\s*)-90'
new_content = re.sub(pattern, r'\g<1>0', content)

with open(filepath, 'w') as f:
    f.write(new_content)
print("Fixed rotation for slot_a4_1")
