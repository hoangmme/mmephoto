import re
import json

with open('user_heart_clips.json') as f:
    heart_clips = json.load(f)

with open('js/modules/pl-globals.js', 'r') as f:
    content = f.read()

# Exact hole bounds from user's PNGs for A4 slots
a4_png_bounds = {
    0: {'cx': 264.0, 'cy': 293.5, 'w': 350.0, 'h': 359.0},
    1: {'cx': 570.0, 'cy': 293.0, 'w': 350.0, 'h': 358.0},
    2: {'cx': 898.0, 'cy': 293.0, 'w': 394.0, 'h': 358.0},
    3: {'cx': 1482.5, 'cy': 444.0, 'w': 389.0, 'h': 550.0},
    4: {'cx': 594.0, 'cy': 948.5, 'w': 956.0, 'h': 573.0},
    5: {'cx': 1482.0, 'cy': 1274.5, 'w': 554.0, 'h': 631.0},
    6: {'cx': 2092.0, 'cy': 1274.5, 'w': 556.0, 'h': 751.0},
    7: {'cx': 346.0, 'cy': 1726.0, 'w': 462.0, 'h': 708.0},
    8: {'cx': 838.0, 'cy': 1723.5, 'w': 462.0, 'h': 709.0},
    9: {'cx': 1622.0, 'cy': 1979.0, 'w': 152.0, 'h': 180.0},
    10: {'cx': 346.0, 'cy': 2474.0, 'w': 462.0, 'h': 708.0},
    11: {'cx': 838.0, 'cy': 2471.0, 'w': 462.0, 'h': 708.0},
    12: {'cx': 1622.0, 'cy': 2174.5, 'w': 152.0, 'h': 179.0},
    13: {'cx': 2093.5, 'cy': 2267.0, 'w': 565.0, 'h': 442.0},
    14: {'cx': 1621.5, 'cy': 2370.5, 'w': 151.0, 'h': 179.0},
    15: {'cx': 1498.0, 'cy': 2661.0, 'w': 400.0, 'h': 322.0},
    16: {'cx': 469.0, 'cy': 3155.5, 'w': 334.0, 'h': 417.0},
    17: {'cx': 777.5, 'cy': 3061.5, 'w': 157.0, 'h': 151.0},
    18: {'cx': 1110.0, 'cy': 3160.5, 'w': 334.0, 'h': 417.0},
    19: {'cx': 1910.5, 'cy': 3163.5, 'w': 761.0, 'h': 411.0},
    20: {'cx': 806.0, 'cy': 3254.0, 'w': 162.0, 'h': 160.0}
}

# Exact hole bounds from user's PNGs for A5 slots
a5_png_bounds = {
    0: {'cx': 435.0, 'cy': 361.0, 'w': 746.0, 'h': 554.0},
    1: {'cx': 1108.0, 'cy': 277.5, 'w': 230.0, 'h': 185.0},
    2: {'cx': 1518.5, 'cy': 192.5, 'w': 263.0, 'h': 211.0},
    3: {'cx': 1054.5, 'cy': 464.0, 'w': 89.0, 'h': 90.0},
    4: {'cx': 1160.5, 'cy': 448.0, 'w': 83.0, 'h': 86.0},
    5: {'cx': 1518.5, 'cy': 425.0, 'w': 263.0, 'h': 212.0},
    6: {'cx': 1106.0, 'cy': 631.5, 'w': 230.0, 'h': 185.0},
    7: {'cx': 1518.5, 'cy': 651.5, 'w': 263.0, 'h': 211.0},
    8: {'cx': 435.0, 'cy': 968.5, 'w': 626.0, 'h': 551.0},
    9: {'cx': 1279.0, 'cy': 1044.0, 'w': 330.0, 'h': 422.0},
    10: {'cx': 927.0, 'cy': 1525.0, 'w': 324.0, 'h': 332.0},
    11: {'cx': 1210.5, 'cy': 1525.0, 'w': 325.0, 'h': 332.0},
    12: {'cx': 1517.0, 'cy': 1525.0, 'w': 370.0, 'h': 332.0},
    13: {'cx': 373.0, 'cy': 2162.5, 'w': 500.0, 'h': 355.0},
    14: {'cx': 1233.5, 'cy': 2131.5, 'w': 887.0, 'h': 531.0}
}

def rebuild_template_slots(content, template_id, bounds_map, clips_map, prefix):
    pattern = r'("' + template_id + r'".*?"slots"\s*:\s*\[\s*)(.*?)(\s*\],\s*"tags")'
    match = re.search(pattern, content, re.DOTALL)
    if not match: return content
    
    slots_str = match.group(2)
    blocks = list(re.finditer(r'\{([^\}]*)\}', slots_str))
    
    new_slots_str = ""
    for i, b in enumerate(blocks):
        block_text = b.group(1)
        
        id_m = re.search(r'"id"\s*:\s*"([^"]+)"', block_text)
        color_m = re.search(r'"color"\s*:\s*"([^"]+)"', block_text)
        rot_m = re.search(r'"rotation"\s*:\s*(-?[\d\.]+)', block_text)
        def_rot_m = re.search(r'"defaultRotation"\s*:\s*(-?[\d\.]+)', block_text)
        
        slot_id = id_m.group(1) if id_m else f"slot_{prefix}_{i}"
        color = color_m.group(1) if color_m else "#ff3131"
        rot = float(rot_m.group(1)) if rot_m else 0.0
        def_rot = float(def_rot_m.group(1)) if def_rot_m else None
        
        # Get bounds
        b_data = bounds_map.get(i, {'cx': 0, 'cy': 0, 'w': 100, 'h': 100})
        cx, cy, w, h = b_data['cx'], b_data['cy'], b_data['w'], b_data['h']
        
        clip_val = clips_map.get(str(i)) or clips_map.get(i)
        
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
        if clip_val:
            lines.append(f'                        "clipPath": "{clip_val}"')
            
        block_json = "{\n" + ",\n".join(lines) + "\n            }"
        new_slots_str += "\n            " + block_json
        if i < len(blocks) - 1:
            new_slots_str += ","
            
    new_content = content[:match.start(2)] + new_slots_str + content[match.end(2):]
    return new_content

content = rebuild_template_slots(content, 'a4-1', a4_png_bounds, heart_clips['a4'], 'a4')
content = rebuild_template_slots(content, 'a5-1', a5_png_bounds, heart_clips['a5'], 'a5')

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("Successfully rebuilt pl-globals.js with user PNG bounds and exact 3-heart clipPaths!")
