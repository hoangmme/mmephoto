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

def rect_to_path_d(x, y, w, h):
    return f"M {x} {y} L {x+w} {y} L {x+w} {y+h} L {x} {y+h} Z"

def extract_real_canva_slots(svg_file, canvas_w, canvas_h):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
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

    viewBox = root.get('viewBox', '').split()
    svg_w = float(viewBox[2]) if len(viewBox) == 4 else float(root.get('width', 1))
    svg_h = float(viewBox[3]) if len(viewBox) == 4 else float(root.get('height', 1))
    
    scale_x = canvas_w / svg_w
    scale_y = canvas_h / svg_h
    
    # Find all elements inside the root group
    # We trace transforms down from root -> master g -> child g
    real_slots = []
    
    # Ignore master document clipPath (which is the first clipPath applied to master g)
    master_g = None
    for child in root:
        if child.tag.endswith('g'):
            master_g = child
            break
            
    if master_g is None:
        master_g = root
        
    def walk_tree(node, current_M):
        node_M = current_M @ parse_matrix(node.get('transform', ''))
        clip_attr = node.get('clip-path', '')
        
        if clip_attr:
            m = re.search(r'url\(#([^)]+)\)', clip_attr)
            if m:
                clip_id = m.group(1)
                # Check if this clip_id is not the full-page master clip
                if clip_id in clip_defs:
                    for ctag, child in clip_defs[clip_id]:
                        child_M = node_M @ parse_matrix(child.get('transform', ''))
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
                        coords = []
                        i = 0
                        cmd = None
                        while i < len(tokens):
                            t = tokens[i]
                            if t.isalpha():
                                cmd = t; i += 1
                                if t in ('Z', 'z'): continue
                            if cmd in ('M', 'L'):
                                x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                                tx, ty = transform_point(child_M, x_pt, y_pt)
                                coords.append((tx * scale_x, ty * scale_y))
                                i += 2
                            elif cmd == 'C':
                                for _ in range(3):
                                    x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                                    tx, ty = transform_point(child_M, x_pt, y_pt)
                                    coords.append((tx * scale_x, ty * scale_y))
                                    i += 2
                            else:
                                i += 1
                                
                        if not coords: continue
                        xs = [c[0] for c in coords]
                        ys = [c[1] for c in coords]
                        min_x, max_x = min(xs), max(xs)
                        min_y, max_y = min(ys), max(ys)
                        bw = max_x - min_x
                        bh = max_y - min_y
                        
                        # Filter full page background image
                        if bw >= canvas_w * 0.9 and bh >= canvas_h * 0.9:
                            continue
                        if bw <= 15 or bh <= 15:
                            continue
                            
                        cx = (min_x + max_x) / 2.0
                        cy = (min_y + max_y) / 2.0
                        
                        # Build relative clipPath
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
                                tx, ty = transform_point(child_M, x_pt, y_pt)
                                rx = tx * scale_x - cx
                                ry = ty * scale_y - cy
                                c_name = 'M' if cmd == 'M' else 'L'
                                rel_parts.append(f"{c_name} {rx:.1f} {ry:.1f}")
                                i += 2
                            elif cmd == 'C':
                                pts = []
                                for _ in range(3):
                                    x_pt, y_pt = float(tokens[i]), float(tokens[i+1])
                                    tx, ty = transform_point(child_M, x_pt, y_pt)
                                    rx = tx * scale_x - cx
                                    ry = ty * scale_y - cy
                                    pts.extend([f"{rx:.1f}", f"{ry:.1f}"])
                                    i += 2
                                rel_parts.append(f"C {' '.join(pts)}")
                            else:
                                i += 1
                                
                        real_slots.append({
                            'clip_id': clip_id,
                            'cx': cx, 'cy': cy, 'w': bw, 'h': bh,
                            'ctag': ctag,
                            'clip_path': " ".join(rel_parts)
                        })

        for child in node:
            walk_tree(child, node_M)

    walk_tree(master_g, np.eye(3))
    return real_slots

slots_a4 = extract_real_canva_slots('a5-1-new.svg', 2480, 3507)
slots_a5 = extract_real_canva_slots('a4-1-new.svg', 1748, 2480)

print(f"Extracted {len(slots_a4)} Canva slots from a5-1-new.svg")
print(f"Extracted {len(slots_a5)} Canva slots from a4-1-new.svg")
