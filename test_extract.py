import base64
import xml.etree.ElementTree as ET

def extract(filename, out):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    images = root.findall('.//svg:image', namespaces)
    img_data = images[0].attrib['{http://www.w3.org/1999/xlink}href']
    b64_data = img_data.split(',')[1]
    
    with open(out, 'wb') as f:
        f.write(base64.b64decode(b64_data))
        
extract('a4-1-new.svg', 'test-a4.png')
extract('a5-1-new.svg', 'test-a5.png')
