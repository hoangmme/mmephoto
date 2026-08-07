import re
import math
import sys
import subprocess
import json

def get_slots(content, template_id):
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    if not match: return []
    
    slots_str = match.group(2)
    
    slots = []
    # parse each slot block
    # They look like: { "id": "slot_a4_0", "color": "#ff3131", "cx": 264.0, "cy": 295.5, "w": 350, "h": 357, "rotation": 180 }
    blocks = re.finditer(r'\{([^\}]*)\}', slots_str)
    for i, b in enumerate(blocks):
        block_text = b.group(1)
        cx_m = re.search(r'"cx"\s*:\s*([\d\.]+)', block_text)
        cy_m = re.search(r'"cy"\s*:\s*([\d\.]+)', block_text)
        w_m = re.search(r'"w"\s*:\s*([\d\.]+)', block_text)
        h_m = re.search(r'"h"\s*:\s*([\d\.]+)', block_text)
        rot_m = re.search(r'"rotation"\s*:\s*(-?[\d\.]+)', block_text)
        if cx_m and cy_m:
            slots.append({
                'cx': float(cx_m.group(1)),
                'cy': float(cy_m.group(1)),
                'w': float(w_m.group(1)) if w_m else 0,
                'h': float(h_m.group(1)) if h_m else 0,
                'rotation': float(rot_m.group(1)) if rot_m else 0,
                'original_index': i
            })
    return slots

# 1. Get old slots
old_content = subprocess.check_output(['git', 'show', 'HEAD^:js/modules/pl-globals.js']).decode('utf-8')
old_a4 = get_slots(old_content, 'a4-1')
old_a5 = get_slots(old_content, 'a5-1')

# 2. Get current (new) slots
with open('js/modules/pl-globals.js', 'r') as f:
    current_content = f.read()
    
new_a4 = get_slots(current_content, 'a4-1')
new_a5 = get_slots(current_content, 'a5-1')

def match_and_reorder(old_slots, new_slots):
    reordered = []
    used_new = set()
    
    for o in old_slots:
        best_n = None
        best_dist = 999999
        for j, n in enumerate(new_slots):
            if j in used_new: continue
            dist = math.hypot(o['cx'] - n['cx'], o['cy'] - n['cy'])
            if dist < best_dist:
                best_dist = dist
                best_n = j
        
        if best_n is not None:
            reordered.append(new_slots[best_n])
            used_new.add(best_n)
            
    # append any unused new slots to the end
    for j, n in enumerate(new_slots):
        if j not in used_new:
            reordered.append(n)
            
    return reordered

reordered_a4 = match_and_reorder(old_a4, new_a4)
reordered_a5 = match_and_reorder(old_a5, new_a5)

# Now write them back
def replace_slots(content, template_id, prefix, old_slots_for_rot, new_slots):
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    
    new_slots_str = ""
    for i, s in enumerate(new_slots):
        # We need to grab the rotation from the old_slots_for_rot if we have it
        rot = old_slots_for_rot[i]['rotation'] if i < len(old_slots_for_rot) else 0
        
        # User explicitly requested these previously, let's enforce them just to be safe
        if prefix == 'a4':
            if i == 0: rot = 180
            elif i == 1: rot = 0
            elif i == 6: rot = 90
            elif i in [16, 17, 18, 20]: rot = -90
            
        new_slots_str += f"""
            {{
                        "id": "slot_{prefix}_{i}",
                        "color": "#ff3131",
                        "cx": {s['cx']},
                        "cy": {s['cy']},
                        "w": {s['w']},
                        "h": {s['h']},
                        "rotation": {rot}
            }}"""
        if i < len(new_slots) - 1:
            new_slots_str += ","
            
    new_content = content[:match.start(2)] + new_slots_str + content[match.end(2):]
    return new_content

current_content = replace_slots(current_content, 'a4-1', 'a4', old_a4, reordered_a4)
current_content = replace_slots(current_content, 'a5-1', 'a5', old_a5, reordered_a5)

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(current_content)

print("Reordered slots to match old indices!")
