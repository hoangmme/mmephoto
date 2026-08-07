import re

with open('js/modules/pl-globals.js', 'r') as f:
    content = f.read()

def shift_top_coords_in_clip(clip_str, dy=-20.0):
    tokens = re.findall(r'[MLCQZHVSAmlcqzhvsa]|[-]?\d+\.?\d*(?:e[-+]?\d+)?', clip_str)
    new_parts = []
    i = 0
    cmd = None
    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t; i += 1
            if t in ('Z', 'z'):
                new_parts.append('Z')
                continue
        if cmd in ('M', 'L'):
            x = float(tokens[i])
            y = float(tokens[i+1])
            if y < -80:
                y += dy
            c_name = 'M' if cmd == 'M' else 'L'
            new_parts.append(f"{c_name} {x:.1f} {y:.1f}")
            i += 2
        elif cmd == 'C':
            pts = []
            for _ in range(3):
                x = float(tokens[i])
                y = float(tokens[i+1])
                if y < -80:
                    y += dy
                pts.extend([f"{x:.1f}", f"{y:.1f}"])
                i += 2
            new_parts.append(f"C {' '.join(pts)}")
        else:
            i += 1
    return " ".join(new_parts)

# Apply shift to slot_a4_0 and slot_a5_10 (and other top hearts)
slots_to_shift = ['slot_a4_0', 'slot_a4_1', 'slot_a4_2', 'slot_a5_10', 'slot_a5_11', 'slot_a5_12']

for s_id in slots_to_shift:
    pattern = rf'("id"\s*:\s*"{s_id}".*?"clipPath"\s*:\s*")([^"]+)(")'
    m = re.search(pattern, content, re.DOTALL)
    if m:
        old_clip = m.group(2)
        new_clip = shift_top_coords_in_clip(old_clip, dy=-20.0)
        print(f"Shifted top clipPath by -20px for {s_id}")
        content = content[:m.start(2)] + new_clip + content[m.end(2):]

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(content)

print("Successfully extended top clipPath height by 20px for heart slots!")
