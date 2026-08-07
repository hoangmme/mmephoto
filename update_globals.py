import re
import cv2
import numpy as np

def process(png_file, mask_file, out_file, w, h, dx, dy):
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY) 
    
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    shifted_mask = cv2.warpAffine(mask, M, (w, h), borderValue=255)
    
    _, inv_mask = cv2.threshold(shifted_mask, 128, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(inv_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw > 80 and bh > 80 and bw < w * 0.9:
            slots.append({'x': x, 'y': y, 'w': bw, 'h': bh})
            
    # Sort strictly by y
    slots.sort(key=lambda b: b['y'])
    return slots

a4_slots = process('a5-png-new.png', 'test-a4.png', 'templates/a4-1.png', 2480, 3507, 6, -6)
a5_slots = process('a4-png-new.png', 'test-a5.png', 'templates/a5-1.png', 1748, 2480, -1, -1.5)

# Read pl-globals.js
with open('js/modules/pl-globals.js', 'r') as f:
    content = f.read()

# We can replace the slots arrays using regex
def replace_slots(content, template_id, slots, prefix):
    # Find the slots array for the template
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"Could not find slots for {template_id}")
        return content
        
    old_slots_str = match.group(2)
    # The old slots string has the rotation values which we need to preserve!
    # Let's extract old rotations by id or index
    old_rotations = {}
    for i, m in enumerate(re.finditer(r'"rotation"\s*:\s*(-?\d+)', old_slots_str)):
        old_rotations[i] = int(m.group(1))
        
    new_slots_str = ""
    for i, s in enumerate(slots):
        cx = s['x'] + s['w'] / 2.0
        cy = s['y'] + s['h'] / 2.0
        rot = old_rotations.get(i, 0)
        
        # User requested specific rotations in their earlier messages:
        # A4:
        # "A4 Khung 0 CẦN XOAY 180 ĐỘ KHI THAY ẢNH VÀO" -> id = slot_a4_0 -> rot = 180
        # "A4 KHUNG 6 CẦN XOAY 90 ĐỘ KHI ĐƯA ẢNH VÀO" -> rot = 90
        # "A4 KHUNG SỐ 1 ĐÂU CẦN XOAI?" -> rot = 0
        if prefix == 'a4':
            if i == 0: rot = 180
            elif i == 1: rot = 0
            elif i == 6: rot = 90
            
        # A5:
        # "A5 16 17 18 20 CẦN XOAY -90 ĐỘ KHI ĐƯA ẢNH VÀO" 
        # Wait, in pl-globals.js, A5 only has 15 slots (0 to 14)!
        # Why did they say 16 17 18 20 for A5? 
        # Ah! When I mistakenly swapped A4 and A5 earlier, A4 (which has 21 slots) was named A5!
        # So "A5 16 17 18 20" was actually referring to A4's slots 16, 17, 18, 20!
        # Let's apply those rotations to A4!
        if prefix == 'a4':
            if i in [16, 17, 18, 20]: rot = -90
        
        # Let's construct the JSON for this slot
        new_slots_str += f"""
            {{
                        "id": "slot_{prefix}_{i}",
                        "color": "#ff3131",
                        "cx": {cx},
                        "cy": {cy},
                        "w": {s['w']},
                        "h": {s['h']},
                        "rotation": {rot}
            }}"""
        if i < len(slots) - 1:
            new_slots_str += ","
            
    # Replace in content
    new_content = content[:match.start(2)] + new_slots_str + content[match.end(2):]
    return new_content

content = replace_slots(content, 'a4-1', a4_slots, 'a4')
content = replace_slots(content, 'a5-1', a5_slots, 'a5')

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("Updated pl-globals.js")
