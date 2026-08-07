import xml.etree.ElementTree as ET
import re
import numpy as np

def parse_matrix(transform_str):
    M = np.eye(3)
    if not transform_str:
        return M
    funcs = re.findall(r'(matrix|translate|scale|rotate)\(([^)]+)\)', transform_str)
    for func, args_str in funcs:
        args = [float(x) for x in re.findall(r'[-]?\d+\.?\d*(?:e[-+]?\d+)?', args_str)]
        T = np.eye(3)
        if func == 'matrix' and len(args) == 6:
            a, b, c, d, e, f = args
            T = np.array([[a, c, e], [b, d, f], [0, 0, 1]])
        elif func == 'translate':
            tx = args[0]
            ty = args[1] if len(args) > 1 else 0
            T = np.array([[1, 0, tx], [0, 1, ty], [0, 0, 1]])
        elif func == 'scale':
            sx = args[0]
            sy = args[1] if len(args) > 1 else sx
            T = np.array([[sx, 0, 0], [0, sy, 0], [0, 0, 1]])
        M = M @ T
    return M

def transform_point(M, x, y):
    pt = np.array([x, y, 1.0])
    res = M @ pt
    return res[0], res[1]

def get_element_transform(elem, parent_map):
    chain = []
    curr = elem
    while curr is not None:
        chain.append(curr)
        curr = parent_map.get(curr)
    chain.reverse()
    
    M = np.eye(3)
    for node in chain:
        if 'transform' in node.attrib:
            M = M @ parse_matrix(node.attrib['transform'])
    return M

def get_svg_all_geometries(svg_file, canvas_w, canvas_h):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
    parent_map = {}
    for p in root.iter():
        for c in p:
            parent_map[c] = p
            
    viewBox = root.get('viewBox', '').split()
    svg_w = float(viewBox[2]) if len(viewBox) == 4 else float(root.get('width', 1))
    svg_h = float(viewBox[3]) if len(viewBox) == 4 else float(root.get('height', 1))
    
    scale_x = canvas_w / svg_w
    scale_y = canvas_h / svg_h
    
    geometries = []
    
    for elem in root.iter():
        tag = elem.tag.split('}')[-1]
        if tag not in ('path', 'rect'):
            continue
            
        M = get_element_transform(elem, parent_map)
        
        if tag == 'rect':
            x = float(elem.get('x', 0))
            y = float(elem.get('y', 0))
            w = float(elem.get('width', 0))
            h = float(elem.get('height', 0))
            if w <= 0 or h <= 0: continue
            
            c1 = transform_point(M, x, y)
            c2 = transform_point(M, x+w, y)
            c3 = transform_point(M, x+w, y+h)
            c4 = transform_point(M, x, y+h)
            
            min_x = min(c1[0], c2[0], c3[0], c4[0]) * scale_x
            max_x = max(c1[0], c2[0], c3[0], c4[0]) * scale_x
            min_y = min(c1[1], c2[1], c3[1], c4[1]) * scale_y
            max_y = max(c1[1], c2[1], c3[1], c4[1]) * scale_y
            
            geometries.append({
                'type': 'rect',
                'id': elem.get('id', ''),
                'cx': (min_x + max_x)/2, 'cy': (min_y + max_y)/2,
                'w': max_x - min_x, 'h': max_y - min_y,
                'elem': elem
            })
        elif tag == 'path':
            d = elem.get('d', '')
            tokens = re.findall(r'[MLCQZHVSAmlcqzhvsa]|[-]?\d+\.?\d*(?:e[-+]?\d+)?', d)
            coords = []
            i = 0
            cmd = None
            while i < len(tokens):
                t = tokens[i]
                if t.isalpha():
                    cmd = t; i += 1
                    if t in ('Z', 'z'): continue
                if cmd in ('M', 'L'):
                    x, y = float(tokens[i]), float(tokens[i+1])
                    tx, ty = transform_point(M, x, y)
                    coords.append((tx * scale_x, ty * scale_y))
                    i += 2
                elif cmd == 'C':
                    for _ in range(3):
                        x, y = float(tokens[i]), float(tokens[i+1])
                        tx, ty = transform_point(M, x, y)
                        coords.append((tx * scale_x, ty * scale_y))
                        i += 2
                else:
                    i += 1
            if not coords: continue
            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            bw = max(xs) - min(xs)
            bh = max(ys) - min(ys)
            if bw <= 10 or bh <= 10: continue
            
            geometries.append({
                'type': 'path',
                'id': elem.get('id', ''),
                'cx': (min(xs) + max(xs))/2, 'cy': (min(ys) + max(ys))/2,
                'w': bw, 'h': bh,
                'elem': elem,
                'd_raw': d,
                'M': M
            })
            
    return geometries, scale_x, scale_y

# Test on a5-1-new.svg (A4 template)
geoms_a4, sx, sy = get_svg_all_geometries('a5-1-new.svg', 2480, 3507)
print(f"a5-1-new.svg has {len(geoms_a4)} printable/clipping geometries")

# Load JS slots for a4-1
with open('js/modules/pl-globals.js') as f:
    js_text = f.read()

import match_all_svg_paths
js_a4_slots = match_all_svg_paths.get_js_slots(js_text, 'a4-1')

print("\n--- Matching JS A4-1 slots to exact SVG geometries ---")
for js_s in js_a4_slots:
    best = None
    best_dist = 999999
    for g in geoms_a4:
        dist = np.hypot(js_s['cx'] - g['cx'], js_s['cy'] - g['cy'])
        size_diff = abs(js_s['w'] - g['w']) + abs(js_s['h'] - g['h'])
        score = dist + size_diff * 0.2
        if score < best_dist:
            best_dist = score
            best = g
    print(f"JS Slot {js_s['index']} ({js_s['cx']:.1f}, {js_s['cy']:.1f}, {js_s['w']}x{js_s['h']}) -> "
          f"SVG {best['type']} ({best['cx']:.1f}, {best['cy']:.1f}, {best['w']:.1f}x{best['h']:.1f}), score={best_dist:.1f}")
