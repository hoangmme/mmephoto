import xml.etree.ElementTree as ET
import re
import numpy as np

def parse_matrix(transform_str):
    """Parse matrix(a,b,c,d,e,f) or translate(x,y) into a 3x3 affine matrix."""
    M = np.eye(3)
    if not transform_str:
        return M
    
    # Find all transform functions in order
    funcs = re.findall(r'(matrix|translate|scale|rotate)\(([^)]+)\)', transform_str)
    for func, args_str in funcs:
        args = [float(x) for x in re.findall(r'[-]?\d+\.?\d*(?:e[-+]?\d+)?', args_str)]
        T = np.eye(3)
        if func == 'matrix' and len(args) == 6:
            a, b, c, d, e, f = args
            T = np.array([[a, c, e],
                          [b, d, f],
                          [0, 0, 1]])
        elif func == 'translate':
            tx = args[0]
            ty = args[1] if len(args) > 1 else 0
            T = np.array([[1, 0, tx],
                          [0, 1, ty],
                          [0, 0, 1]])
        elif func == 'scale':
            sx = args[0]
            sy = args[1] if len(args) > 1 else sx
            T = np.array([[sx, 0, 0],
                          [0, sy, 0],
                          [0, 0, 1]])
        M = M @ T
    return M

def transform_point(M, x, y):
    pt = np.array([x, y, 1.0])
    res = M @ pt
    return res[0], res[1]

def get_element_transform(elem, parent_map):
    """Compute combined 3x3 matrix from root to elem."""
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

def analyze_svg_objects(svg_file):
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
    # Build parent map
    parent_map = {}
    for p in root.iter():
        for c in p:
            parent_map[c] = p
            
    viewBox = root.get('viewBox', '')
    w_str = root.get('width', '')
    h_str = root.get('height', '')
    print(f"=== {svg_file} ===")
    print(f"viewBox: {viewBox}, width: {w_str}, height: {h_str}")
    
    # Extract rects
    rects = []
    for elem in root.iter():
        tag = elem.tag.split('}')[-1]
        if tag == 'rect':
            x = float(elem.get('x', 0))
            y = float(elem.get('y', 0))
            w = float(elem.get('width', 0))
            h = float(elem.get('height', 0))
            rx = float(elem.get('rx', 0))
            ry = float(elem.get('ry', 0))
            
            M = get_element_transform(elem, parent_map)
            # Transform 4 corners
            c1 = transform_point(M, x, y)
            c2 = transform_point(M, x+w, y)
            c3 = transform_point(M, x+w, y+h)
            c4 = transform_point(M, x, y+h)
            
            min_x = min(c1[0], c2[0], c3[0], c4[0])
            max_x = max(c1[0], c2[0], c3[0], c4[0])
            min_y = min(c1[1], c2[1], c3[1], c4[1])
            max_y = max(c1[1], c2[1], c3[1], c4[1])
            
            rects.append({
                'id': elem.get('id', ''),
                'x': min_x, 'y': min_y, 'w': max_x - min_x, 'h': max_y - min_y,
                'cx': (min_x + max_x)/2, 'cy': (min_y + max_y)/2,
                'rx': rx, 'ry': ry,
                'fill': elem.get('fill', ''),
                'stroke': elem.get('stroke', '')
            })
            
    print(f"Parsed {len(rects)} <rect> elements:")
    for i, r in enumerate(rects):
        print(f"  [{i}] id={r['id']} cx={r['cx']:.1f}, cy={r['cy']:.1f}, w={r['w']:.1f}, h={r['h']:.1f}, rx={r['rx']}")

    # Extract clipPaths
    clip_paths = []
    for elem in root.iter():
        tag = elem.tag.split('}')[-1]
        if tag == 'clipPath':
            clip_id = elem.get('id', '')
            # Get child paths/rects inside clipPath
            child_desc = []
            for child in elem:
                ctag = child.tag.split('}')[-1]
                if ctag == 'path':
                    d = child.get('d', '')
                    child_desc.append(f"path({len(d)} chars)")
                elif ctag == 'rect':
                    child_desc.append(f"rect({child.get('width')}x{child.get('height')})")
            clip_paths.append({'id': clip_id, 'children': child_desc})
            
    print(f"\nParsed {len(clip_paths)} <clipPath> elements (showing first 15):")
    for cp in clip_paths[:15]:
        print(f"  clipPath id={cp['id']}: {', '.join(cp['children'])}")

analyze_svg_objects('a4-1-new.svg')
analyze_svg_objects('a5-1-new.svg')
