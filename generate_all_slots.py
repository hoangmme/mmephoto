import cv2
import numpy as np
import base64
import xml.etree.ElementTree as ET
from io import BytesIO
from PIL import Image

def extract_slots(filename):
    tree = ET.parse(filename)
    root = tree.getroot()
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    images = root.findall('.//svg:image', namespaces)
    img_data = images[0].attrib['{http://www.w3.org/1999/xlink}href']
    b64_data = img_data.split(',')[1]
    
    img = Image.open(BytesIO(base64.b64decode(b64_data))).convert("RGB")
    cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 80 and h > 80: # threshold to 80
            slots.append({"x": x, "y": y, "width": w, "height": h})
            
    slots.sort(key=lambda s: s['y'])
    rows = []
    for s in slots:
        if not rows or s['y'] - rows[-1][0]['y'] > 150:
            rows.append([s])
        else:
            rows[-1].append(s)
            
    sorted_slots = []
    for r in rows:
        r.sort(key=lambda s: s['x'])
        sorted_slots.extend(r)
        
    print(f"\n--- {filename} ---")
    for idx, s in enumerate(sorted_slots):
        print(f"Slot {idx}: x={s['x']}, y={s['y']}, w={s['width']}, h={s['height']}")

extract_slots('a4-1-new.svg')
extract_slots('a5-1-new.svg')
