import json
import re
import numpy as np
from generate_all_svg_clippaths import extract_svg_clip_shapes, generate_rel_clippath

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

js_a4_slots = parse_template_slots(globals_content, 'a4-1')
js_a5_slots = parse_template_slots(globals_content, 'a5-1')

a4_shapes = extract_svg_clip_shapes('a5-1-new.svg', 2480, 3507)
a5_shapes = extract_svg_clip_shapes('a4-1-new.svg', 1748, 2480)

def generate_slot_clips(js_slots, svg_shapes, label):
    results = {}
    print(f"\n=== Generating clipPaths for {label} ===")
    for js_s in js_slots:
        best_shape = None
        best_dist = 999999
        for shape in svg_shapes:
            dist = np.hypot(js_s['cx'] - shape['cx'], js_s['cy'] - shape['cy'])
            size_diff = abs(js_s['w'] - shape['w']) + abs(js_s['h'] - shape['h'])
            score = dist + size_diff * 0.2
            if score < best_dist:
                best_dist = score
                best_shape = shape
                
        if best_shape:
            clip = generate_rel_clippath(best_shape, js_s['cx'], js_s['cy'])
            results[js_s['index']] = clip
            print(f"  Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) matched SVG ({best_shape['cx']:.1f}, {best_shape['cy']:.1f}), score={best_dist:.1f}, clip_len={len(clip)}")
        else:
            print(f"  Slot {js_s['index']} NO MATCH!")
    return results

a4_clips = generate_slot_clips(js_a4_slots, a4_shapes, "A4 Template (a4-1, 21 slots)")
a5_clips = generate_slot_clips(js_a5_slots, a5_shapes, "A5 Template (a5-1, 15 slots)")

with open('all_slots_clips.json', 'w') as f:
    json.dump({'a4': a4_clips, 'a5': a5_clips}, f, indent=2)

print("\nSaved all clipPaths to all_slots_clips.json")
