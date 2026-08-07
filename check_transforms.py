import xml.etree.ElementTree as ET
def check(filename):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    images = root.findall('.//svg:image', namespaces)
    for i, img in enumerate(images):
        transform = img.attrib.get('transform', '')
        if transform:
            print(f"Image {i} transform: {transform}")

check('a4-1-new.svg')
