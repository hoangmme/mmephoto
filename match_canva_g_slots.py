import re
import numpy as np
import json
from parse_canva_g_clips import extract_canva_g_slots

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

a4_canva_g = extract_canva_g_slots('a5-1-new.svg', 2480, 3507)
a5_canva_g = extract_canva_g_slots('a4-1-new.svg', 1748, 2480)

def match_and_generate_clips(js_slots, canva_slots, label):
    matched_clips = {}
    print(f"\n=== Matching {label} ===")
    
    for js_s in js_slots:
        best_slot = None
        best_dist = 999999
        for c_s in canva_slots:
            dist = np.hypot(js_s['cx'] - c_s['cx'], js_s['cy'] - c_s['cy'])
            size_diff = abs(js_s['w'] - c_s['w']) + abs(js_s['h'] - c_s['h'])
            score = dist + size_diff * 0.2
            if score < best_dist:
                best_dist = score
                best_slot = c_s
                
        if best_slot and best_dist < 200:
            print(f"  Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) -> Canva Slot ({best_slot['cx']:.1f}, {best_slot['cy']:.1f}), dist={best_dist:.1f}px, ctag={best_slot['ctag']}")
            matched_clips[js_s['index']] = best_slot['clip_path']
        else:
            print(f"  Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}) -> NO MATCH (best dist={best_dist:.1f})")
            
    return matched_clips

a4_clips = match_and_generate_clips(js_a4_slots, a4_canva_g, "A4 Template (21 slots)")
a5_clips = match_and_generate_clips(js_a5_slots, a5_canva_g, "A5 Template (15 slots)")

print(f"\nSuccessfully generated clipPaths for {len(a4_clips)}/21 A4 slots and {len(a5_clips)}/15 A5 slots.")

with open('all_canva_clippaths.json', 'w') as f:
    json.dump({'a4': a4_clips, 'a5': a5_clips}, f, indent=2)
