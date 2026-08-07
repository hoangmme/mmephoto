import re
import numpy as np

with open('js/modules/pl-globals.js', 'r') as f:
    text = f.read()

def parse_clip_bounds(clip_str):
    nums = re.findall(r'[-]?\d+\.?\d*', clip_str)
    coords = []
    for i in range(0, len(nums)-1, 2):
        try:
            coords.append((float(nums[i]), float(nums[i+1])))
        except:
            pass
    if not coords: return 0, 0, 0, 0
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return min(xs), max(xs), min(ys), max(ys)

# Parse each slot block and update w and h to match clipPath bounding box
def update_slot_bounds(content, template_id):
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
        cx_m = re.search(r'"cx"\s*:\s*([\d\.]+)', block_text)
        cy_m = re.search(r'"cy"\s*:\s*([\d\.]+)', block_text)
        w_m = re.search(r'"w"\s*:\s*([\d\.]+)', block_text)
        h_m = re.search(r'"h"\s*:\s*([\d\.]+)', block_text)
        rot_m = re.search(r'"rotation"\s*:\s*(-?[\d\.]+)', block_text)
        def_rot_m = re.search(r'"defaultRotation"\s*:\s*(-?[\d\.]+)', block_text)
        clip_m = re.search(r'"clipPath"\s*:\s*"([^"]+)"', block_text)
        
        slot_id = id_m.group(1) if id_m else f"slot_{i}"
        color = color_m.group(1) if color_m else "#ff3131"
        cx = float(cx_m.group(1)) if cx_m else 0
        cy = float(cy_m.group(1)) if cy_m else 0
        old_w = float(w_m.group(1)) if w_m else 0
        old_h = float(h_m.group(1)) if h_m else 0
        rot = float(rot_m.group(1)) if rot_m else 0.0
        def_rot = float(def_rot_m.group(1)) if def_rot_m else None
        clip_path_val = clip_m.group(1) if clip_m else None
        
        new_w = old_w
        new_h = old_h
        
        if clip_path_val:
            min_x, max_x, min_y, max_y = parse_clip_bounds(clip_path_val)
            clip_w = round(max_x - min_x, 1)
            clip_h = round(max_y - min_y, 1)
            if clip_w > 10 and clip_h > 10:
                new_w = clip_w
                new_h = clip_h
                print(f"  {slot_id}: updated w={old_w} -> {new_w}, h={old_h} -> {new_h}")
                
        lines = [
            f'                        "id": "{slot_id}"',
            f'                        "color": "{color}"',
            f'                        "cx": {cx}',
            f'                        "cy": {cy}',
            f'                        "w": {new_w}',
            f'                        "h": {new_h}',
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

content = update_slot_bounds(text, 'a4-1')
content = update_slot_bounds(content, 'a5-1')

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("\nSuccessfully updated w and h in js/modules/pl-globals.js to match exact clipPath bounds!")
