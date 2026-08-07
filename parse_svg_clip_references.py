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

def parse_path_d(d_str, M):
    """Parse path commands and transform coordinates using 3x3 matrix M."""
    tokens = re.findall(r'[MLCQZHVSAmlcqzhvsa]|[-]?\d+\.?\d*(?:e[-+]?\d+)?', d_str)
    transformed_parts = []
    
    i = 0
    cmd = None
    coords = []
    
    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            i += 1
            if t in ('Z', 'z'):
                transformed_parts.append('Z')
                continue
        
        if cmd in ('M', 'L'):
            x = float(tokens[i])
            y = float(tokens[i+1])
            tx, ty = transform_point(M, x, y)
            coords.append((tx, ty))
            cmd_name = 'M' if cmd == 'M' else 'L'
            transformed_parts.append(f"{cmd_name} {tx:.2f} {ty:.2f}")
            i += 2
        elif cmd == 'C':
            c_pts = []
            for _ in range(3):
                x = float(tokens[i])
                y = float(tokens[i+1])
                tx, ty = transform_point(M, x, y)
                coords.append((tx, ty))
                c_pts.extend([f"{tx:.2f}", f"{ty:.2f}"])
                i += 2
            transformed_parts.append(f"C {' '.join(c_pts)}")
        elif cmd == 'Q':
            q_pts = []
            for _ in range(2):
                x = float(tokens[i])
                y = float(tokens[i+1])
                tx, ty = transform_point(M, x, y)
                coords.append((tx, ty))
                q_pts.extend([f"{tx:.2f}", f"{ty:.2f}"])
                i += 2
            transformed_parts.append(f"Q {' '.join(q_pts)}")
        else:
            i += 1
            
    # Calculate bounding box
    if coords:
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        bbox = (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))
    else:
        bbox = (0, 0, 0, 0)
        
    return " ".join(transformed_parts), bbox

def extract_all_slots_from_svg(svg_file, canvas_w, canvas_h):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
    parent_map = {}
    for p in root.iter():
        for c in p:
            parent_map[c] = p
            
    viewBox = root.get('viewBox', '').split()
    if len(viewBox) == 4:
        svg_w = float(viewBox[2])
        svg_h = float(viewBox[3])
    else:
        svg_w = float(root.get('width', 1))
        svg_h = float(root.get('height', 1))
        
    scale_x = canvas_w / svg_w
    scale_y = canvas_h / svg_h
    
    print(f"=== Extracting Slots from {svg_file} ===")
    print(f"SVG dim: {svg_w} x {svg_h} -> Canvas dim: {canvas_w} x {canvas_h}")
    
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

    # Find all elements referencing clip-path
    slots_found = []
    
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
            
        # Get element's full transform matrix
        M_elem = get_element_transform(elem, parent_map)
        
        # Process clipPath children
        for ctag, child in clip_defs[clip_id]:
            M_child = get_element_transform(child, parent_map)
            # Combine matrices
            M_total = M_elem @ M_child
            
            if ctag == 'rect':
                rx_val = float(child.get('rx', 0))
                x = float(child.get('x', 0))
                y = float(child.get('y', 0))
                w = float(child.get('width', 0))
                h = float(child.get('height', 0))
                
                # Transform corners
                c1 = transform_point(M_total, x, y)
                c2 = transform_point(M_total, x+w, y)
                c3 = transform_point(M_total, x+w, y+h)
                c4 = transform_point(M_total, x, y+h)
                
                min_x = min(c1[0], c2[0], c3[0], c4[0])
                max_x = max(c1[0], c2[0], c3[0], c4[0])
                min_y = min(c1[1], c2[1], c3[1], c4[1])
                max_y = max(c1[1], c2[1], c3[1], c4[1])
                
                # Convert to canvas coords
                cx_canvas = ((min_x + max_x) / 2) * scale_x
                cy_canvas = ((min_y + max_y) / 2) * scale_y
                w_canvas = (max_x - min_x) * scale_x
                h_canvas = (max_y - min_y) * scale_y
                
                slots_found.append({
                    'type': 'rect',
                    'clip_id': clip_id,
                    'cx': cx_canvas, 'cy': cy_canvas,
                    'w': w_canvas, 'h': h_canvas,
                    'rx': rx_val * scale_x,
                    'path': None
                })
            elif ctag == 'path':
                d = child.get('d', '')
                path_svg, bbox_svg = parse_path_d(d, M_total)
                
                min_x, min_y, bw, bh = bbox_svg
                cx_canvas = (min_x + bw/2) * scale_x
                cy_canvas = (min_y + bh/2) * scale_y
                w_canvas = bw * scale_x
                h_canvas = bh * scale_y
                
                # Also scale path coordinates relative to slot center
                # We can generate clipPath string
                tokens = re.findall(r'[MLCQZHVSAmlcqzhvsa]|[-]?\d+\.?\d*(?:e[-+]?\d+)?', d)
                # Convert path to canvas clipPath relative to cx, cy
                rel_parts = []
                i = 0
                cmd = None
                while i < len(tokens):
                    t = tokens[i]
                    if t.isalpha():
                        cmd = t
                        i += 1
                        if t in ('Z', 'z'):
                            rel_parts.append('Z')
                            continue
                    if cmd in ('M', 'L'):
                        x, y = float(tokens[i]), float(tokens[i+1])
                        tx, ty = transform_point(M_total, x, y)
                        rel_x = tx * scale_x - cx_canvas
                        rel_y = ty * scale_y - cy_canvas
                        c_name = 'M' if cmd == 'M' else 'L'
                        rel_parts.append(f"{c_name} {rel_x:.1f} {rel_y:.1f}")
                        i += 2
                    elif cmd == 'C':
                        pts = []
                        for _ in range(3):
                            x, y = float(tokens[i]), float(tokens[i+1])
                            tx, ty = transform_point(M_total, x, y)
                            rel_x = tx * scale_x - cx_canvas
                            rel_y = ty * scale_y - cy_canvas
                            pts.extend([f"{rel_x:.1f}", f"{rel_y:.1f}"])
                            i += 2
                        rel_parts.append(f"C {' '.join(pts)}")
                    else:
                        i += 1
                        
                clip_path_str = " ".join(rel_parts)
                
                slots_found.append({
                    'type': 'path',
                    'clip_id': clip_id,
                    'cx': cx_canvas, 'cy': cy_canvas,
                    'w': w_canvas, 'h': h_canvas,
                    'rx': 0,
                    'path': clip_path_str
                })

    # Sort slots by Y coordinate
    slots_found.sort(key=lambda s: s['cy'])
    print(f"Total slots extracted from SVG: {len(slots_found)}")
    for i, s in enumerate(slots_found):
        print(f"  Slot {i}: type={s['type']}, cx={s['cx']:.1f}, cy={s['cy']:.1f}, w={s['w']:.1f}, h={s['h']:.1f}, has_path={s['path'] is not None}")

    return slots_found

a5_svg_slots = extract_all_slots_from_svg('a5-1-new.svg', 2480, 3507)
print()
a4_svg_slots = extract_all_slots_from_svg('a4-1-new.svg', 1748, 2480)
