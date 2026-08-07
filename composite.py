import xml.etree.ElementTree as ET
import base64
from PIL import Image
from io import BytesIO

def composite_svg(filename, out, w, h):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg', 'xlink': 'http://www.w3.org/1999/xlink'}
    
    # Create empty transparent canvas
    canvas = Image.new('RGBA', (w, h), (0,0,0,0))
    
    images = root.findall('.//svg:image', namespaces)
    for img_node in images:
        href = img_node.attrib.get('{http://www.w3.org/1999/xlink}href')
        if not href: continue
        if not href.startswith('data:image'): continue
        
        b64_data = href.split(',')[1]
        img_data = base64.b64decode(b64_data)
        layer = Image.open(BytesIO(img_data)).convert("RGBA")
        
        x = float(img_node.attrib.get('x', 0))
        y = float(img_node.attrib.get('y', 0))
        width = float(img_node.attrib.get('width', layer.width))
        height = float(img_node.attrib.get('height', layer.height))
        
        layer = layer.resize((int(width), int(height)))
        canvas.paste(layer, (int(x), int(y)), layer)
        
    canvas.save(out)
    print(f"Saved {out}")

composite_svg('a4-1-new.svg', 'new-a4.png', 2480, 3507)
composite_svg('a5-1-new.svg', 'new-a5.png', 2480, 2480) # wait, A5 is 2480x2480 in SVG?
