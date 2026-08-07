import xml.etree.ElementTree as ET
import base64
from PIL import Image

def extract(filename, img_index, out_name):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg', 'xlink': 'http://www.w3.org/1999/xlink'}
    images = root.findall('.//svg:image', namespaces)
    
    img_node = images[img_index]
    href = img_node.attrib.get('{http://www.w3.org/1999/xlink}href')
    b64_data = href.split(',')[1]
    
    with open(out_name, 'wb') as f:
        f.write(base64.b64decode(b64_data))
    
    print(f"Extracted {out_name}")

# Now a4-1-new.svg is the Magazine (23 images, mask at 0, color at 22)
extract('a4-1-new.svg', 22, 'test-color-a4.png')
extract('a4-1-new.svg', 0, 'test-a4.png')

# Now a5-1-new.svg is the Love (17 images, mask at 0, color at 16)
extract('a5-1-new.svg', 16, 'test-color-a5.png')
extract('a5-1-new.svg', 0, 'test-a5.png')
