import re
import json
import numpy as np
import xml.etree.ElementTree as ET

from parse_canva_real_slots import extract_real_canva_slots

# Read pl-globals.js
with open('js/modules/pl-globals.js', 'r') as f:
    globals_content = f.read()

def parse_template_slots(content, template_id):
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    if not match: return []
    slots_str = match.group(2)
    
    slots = []
    blocks = re.finditer(r'\{([^\}]*)\}', slots_str)
    for i, b in enumerate(blocks):
        block_text = b.group(1)
        cx_m = re.search(r'"cx"\s*:\s*([\d\.]+)', block_text)
        cy_m = re.search(r'"cy"\s*:\s*([\d\.]+)', block_text)
        w_m = re.search(r'"w"\s*:\s*([\d\.]+)', block_text)
        h_m = re.search(r'"h"\s*:\s*([\d\.]+)', block_text)
        if cx_m and cy_m:
            slots.append({
                'id': f"slot_{template_id}_{i}",
                'index': i,
                'cx': float(cx_m.group(1)),
                'cy': float(cy_m.group(1)),
                'w': float(w_m.group(1)) if w_m else 0,
                'h': float(h_m.group(1)) if h_m else 0
            })
    return slots

js_a4_slots = parse_template_slots(globals_content, 'a4-1') # 21 slots
js_a5_slots = parse_template_slots(globals_content, 'a5-1') # 15 slots

# a4-1 template (2480x3507) -> a4-1-new.svg
# a5-1 template (1748x2480) -> a5-1-new.svg
svg_a4_slots = extract_real_canva_slots('a4-1-new.svg', 2480, 3507)
svg_a5_slots = extract_real_canva_slots('a5-1-new.svg', 1748, 2480)

def match_and_get_exact_clips(js_slots, svg_slots, label):
    clips = {}
    print(f"\n=== Extracting exact Canva SVG clipPaths for {label} ===")
    for js_s in js_slots:
        best = None
        best_dist = 999999
        for s_s in svg_slots:
            dist = np.hypot(js_s['cx'] - s_s['cx'], js_s['cy'] - s_s['cy'])
            if dist < best_dist:
                best_dist = dist
                best = s_s
                
        if best and best_dist < 100:
            print(f"  Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) -> Canva SVG ({best['cx']:.1f}, {best['cy']:.1f}) dist={best_dist:.1f}px MATCH!")
            clips[js_s['index']] = best['clip_path']
        else:
            print(f"  Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) NO MATCH (dist={best_dist:.1f})")
    return clips

a4_clips = match_and_get_exact_clips(js_a4_slots, svg_a4_slots, "a4-1 (A4 template, 21 slots)")
a5_clips = match_and_get_exact_clips(js_a5_slots, svg_a5_slots, "a5-1 (A5 template, 15 slots)")

print(f"\nTotal exact Canva SVG clipPaths extracted: A4 = {len(a4_clips)}/21, A5 = {len(a5_clips)}/15")

# Now inject into pl-globals.js
def update_js_with_clips(content, template_id, prefix, clips_map):
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    if not match: return content
    
    slots_str = match.group(2)
    
    # We rebuild the slot JSON blocks
    new_slots_str = ""
    blocks = list(re.finditer(r'\{([^\}]*)\}', slots_str))
    
    for i, b in enumerate(blocks):
        block_text = b.group(1)
        
        # Parse fields
        id_m = re.search(r'"id"\s*:\s*"([^"]+)"', block_text)
        color_m = re.search(r'"color"\s*:\s*"([^"]+)"', block_text)
        cx_m = re.search(r'"cx"\s*:\s*([\d\.]+)', block_text)
        cy_m = re.search(r'"cy"\s*:\s*([\d\.]+)', block_text)
        w_m = re.search(r'"w"\s*:\s*([\d\.]+)', block_text)
        h_m = re.search(r'"h"\s*:\s*([\d\.]+)', block_text)
        rot_m = re.search(r'"rotation"\s*:\s*(-?[\d\.]+)', block_text)
        def_rot_m = re.search(r'"defaultRotation"\s*:\s*(-?[\d\.]+)', block_text)
        
        slot_id = id_m.group(1) if id_m else f"slot_{prefix}_{i}"
        color = color_m.group(1) if color_m else "#ff3131"
        cx = float(cx_m.group(1)) if cx_m else 0
        cy = float(cy_m.group(1)) if cy_m else 0
        w = float(w_m.group(1)) if w_m else 0
        h = float(h_m.group(1)) if h_m else 0
        rot = float(rot_m.group(1)) if rot_m else 0.0
        def_rot = float(def_rot_m.group(1)) if def_rot_m else None
        
        clip_path_val = clips_map.get(i)
        
        # Construct JSON block
        lines = [
            f'                        "id": "{slot_id}"',
            f'                        "color": "{color}"',
            f'                        "cx": {cx}',
            f'                        "cy": {cy}',
            f'                        "w": {w}',
            f'                        "h": {h}',
            f'                        "rotation": {rot}'
        ]
        if def_rot is not None:
            lines.append(f'                        "defaultRotation": {def_rot}')
        if clip_path_val:
            lines.append(f'                        "clipPath": "{clip_path_val}"')
            
        block_json = "{\n" + ",\n".join(lines) + "\n            }"
        new_slots_str += "\n            " + block_json
        if i < len(blocks) - 1:
            new_slots_str += ","
            
    new_content = content[:match.start(2)] + new_slots_str + content[match.end(2):]
    return new_content

updated_content = update_js_with_clips(globals_content, 'a4-1', 'a4', a4_clips)
updated_content = update_js_with_clips(updated_content, 'a5-1', 'a5', a5_clips)

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(updated_content)

print("Successfully updated js/modules/pl-globals.js with EXACT Canva SVG vector clipPaths for ALL slots!")
