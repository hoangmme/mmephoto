import xml.etree.ElementTree as ET
import re
import numpy as np
import json

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

def rect_to_path_d(x, y, w, h):
    return f"M {x} {y} L {x+w} {y} L {x+w} {y+h} L {x} {y+h} Z"

def extract_canva_g_slots(svg_file, canvas_w, canvas_h):
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
    
    # Store clipPaths by id
    clip_defs = {}
    for elem in root.iter():
        tag = elem.tag.split('}')[-1]
        if tag == 'clipPath':
            clip_id = elem.get('id', '')
            children = []
            for child in elem:
                ctag = child.tag.split('}')[-1]
                children.append((ctag, child))
            clip_defs[clip_id] = children

    g_slots = []
    
    for elem in root.iter():
        clip_attr = elem.get('clip-path', '')
        if not clip_attr:
            continue
            
        m = re.search(r'url\(#([^)]+)\)', clip_attr)
        if not m:
            continue
        clip_id = m.group(1)
        if clip_id not in clip_defs:
            continue
            
        # Get g's full matrix transform
        M_g = get_element_transform(elem, parent_map)
        
        for ctag, child in clip_defs[clip_id]:
            M_child = get_element_transform(child, parent_map)
            M_total = M_g @ M_child
            
            if ctag == 'rect':
                x = float(child.get('x', 0))
                y = float(child.get('y', 0))
                w = float(child.get('width', 0))
                h = float(child.get('height', 0))
                d_str = rect_to_path_d(x, y, w, h)
            elif ctag == 'path':
                d_str = child.get('d', '')
            else:
                continue
                
            tokens = re.findall(r'[MLCQZHVSAmlcqzhvsa]|[-]?\d+\.?\d*(?:e[-+]?\d+)?', d_str)
            abs_coords = []
            i = 0
            cmd = None
            
            while i < len(tokens):
                t = tokens[i]
                if t.isalpha():
                    cmd = t; i += 1
                    if t in ('Z', 'z'): continue
                if cmd in ('M', 'L'):
                    x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                    tx, ty = transform_point(M_total, x_pt, y_pt)
                    abs_coords.append((tx * scale_x, ty * scale_y))
                    i += 2
                elif cmd == 'C':
                    for _ in range(3):
                        x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                        tx, ty = transform_point(M_total, x_pt, y_pt)
                        abs_coords.append((tx * scale_x, ty * scale_y))
                        i += 2
                else:
                    i += 1
                    
            if not abs_coords: continue
            
            xs = [c[0] for c in abs_coords]
            ys = [c[1] for c in abs_coords]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            bw = max_x - min_x
            bh = max_y - min_y
            
            if bw >= canvas_w * 0.95 and bh >= canvas_h * 0.95:
                continue
            if bw <= 15 or bh <= 15:
                continue
                
            cx = (min_x + max_x) / 2.0
            cy = (min_y + max_y) / 2.0
            
            # Generate clipPath string relative to cx, cy
            rel_parts = []
            i = 0
            cmd = None
            while i < len(tokens):
                t = tokens[i]
                if t.isalpha():
                    cmd = t; i += 1
                    if t in ('Z', 'z'):
                        rel_parts.append('Z')
                        continue
                if cmd in ('M', 'L'):
                    x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                    tx, ty = transform_point(M_total, x_pt, y_pt)
                    rx = tx * scale_x - cx
                    ry = ty * scale_y - cy
                    c_name = 'M' if cmd == 'M' else 'L'
                    rel_parts.append(f"{c_name} {rx:.1f} {ry:.1f}")
                    i += 2
                elif cmd == 'C':
                    pts = []
                    for _ in range(3):
                        x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                        tx, ty = transform_point(M_total, x_pt, y_pt)
                        rx = tx * scale_x - cx
                        ry = ty * scale_y - cy
                        pts.extend([f"{rx:.1f}", f"{ry:.1f}"])
                        i += 2
                    rel_parts.append(f"C {' '.join(pts)}")
                else:
                    i += 1
                    
            clip_path_str = " ".join(rel_parts)
            
            g_slots.append({
                'clip_id': clip_id,
                'cx': cx, 'cy': cy, 'w': bw, 'h': bh,
                'ctag': ctag,
                'clip_path': clip_path_str
            })
            
    return g_slots

a4_canva_g = extract_canva_g_slots('a5-1-new.svg', 2480, 3507)
a5_canva_g = extract_canva_g_slots('a4-1-new.svg', 1748, 2480)

print(f"Extracted {len(a4_canva_g)} Canva <g> slots from a5-1-new.svg for A4 template")
print(f"Extracted {len(a5_canva_g)} Canva <g> slots from a4-1-new.svg for A5 template")
