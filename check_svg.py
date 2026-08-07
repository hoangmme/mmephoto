import xml.etree.ElementTree as ET
def check(filename):
    tree = ET.parse(filename)
    root = tree.getroot()
    print(f"{filename}: width={root.attrib.get('width')}, height={root.attrib.get('height')}, viewBox={root.attrib.get('viewBox')}")

check('a4-1-new.svg')
check('a5-1-new.svg')
