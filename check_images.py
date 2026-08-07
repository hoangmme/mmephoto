import xml.etree.ElementTree as ET
import sys
def check(filename):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    images = root.findall('.//svg:image', namespaces)
    print(f"{filename} has {len(images)} images")
    for i, img in enumerate(images):
        w = img.attrib.get('width')
        h = img.attrib.get('height')
        x = img.attrib.get('x')
        y = img.attrib.get('y')
        print(f"Image {i}: x={x}, y={y}, w={w}, h={h}")

check('a5-1-new.svg')
