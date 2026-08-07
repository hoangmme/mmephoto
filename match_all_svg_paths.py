import re
import numpy as np
import json
import xml.etree.ElementTree as ET

from parse_svg_clip_references import extract_all_slots_from_svg

# Load current slots from pl-globals.js
with open('js/modules/pl-globals.js', 'r') as f:
    globals_content = f.read()

def get_js_slots(content, template_id):
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

js_a4_slots = get_js_slots(globals_content, 'a4-1') # 21 slots
js_a5_slots = get_js_slots(globals_content, 'a5-1') # 15 slots

print(f"JS a4-1 has {len(js_a4_slots)} slots")
print(f"JS a5-1 has {len(js_a5_slots)} slots")

# Extract SVG slots
# a4-1 template uses a5-1-new.svg (canvas 2480 x 3507)
svg_a4_slots = extract_all_slots_from_svg('a5-1-new.svg', 2480, 3507)
# a5-1 template uses a4-1-new.svg (canvas 1748 x 2480)
svg_a5_slots = extract_all_slots_from_svg('a4-1-new.svg', 1748, 2480)

def match_js_to_svg(js_slots, svg_slots, label):
    matched = []
    print(f"\n=== Matching {label} ===")
    for js_s in js_slots:
        best_match = None
        best_dist = 999999
        for svg_s in svg_slots:
            dist = np.hypot(js_s['cx'] - svg_s['cx'], js_s['cy'] - svg_s['cy'])
            if dist < best_dist:
                best_dist = dist
                best_match = svg_s
                
        if best_match and best_dist < 150:
            print(f"  JS Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) -> "
                  f"SVG Slot ({best_match['cx']:.1f}, {best_match['cy']:.1f}) dist={best_dist:.1f}px, "
                  f"type={best_match['type']}, has_path={best_match['path'] is not None}")
            matched.append((js_s, best_match))
        else:
            print(f"  JS Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) -> NO MATCH (best dist={best_dist:.1f})")
    return matched

matches_a4 = match_js_to_svg(js_a4_slots, svg_a4_slots, "a4-1 (A4 template)")
matches_a5 = match_js_to_svg(js_a5_slots, svg_a5_slots, "a5-1 (A5 template)")
