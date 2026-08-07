import re

with open('js/modules/pl-globals.js') as f:
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

blocks = list(re.finditer(r'\{([^\}]*)\}', text))
for b in blocks:
    b_text = b.group(1)
    id_m = re.search(r'"id"\s*:\s*"([^"]+)"', b_text)
    w_m = re.search(r'"w"\s*:\s*([\d\.]+)', b_text)
    h_m = re.search(r'"h"\s*:\s*([\d\.]+)', b_text)
    clip_m = re.search(r'"clipPath"\s*:\s*"([^"]+)"', b_text)
    
    if id_m and w_m and h_m and clip_m:
        slot_id = id_m.group(1)
        w = float(w_m.group(1))
        h = float(h_m.group(1))
        clip = clip_m.group(1)
        min_x, max_x, min_y, max_y = parse_clip_bounds(clip)
        clip_w = max_x - min_x
        clip_h = max_y - min_y
        cx_offset = (min_x + max_x) / 2
        cy_offset = (min_y + max_y) / 2
        print(f"{slot_id}: slotDef=(w={w}, h={h}) | clipPath=(w={clip_w:.1f}, h={clip_h:.1f}, offset=({cx_offset:.1f}, {cy_offset:.1f}))")
