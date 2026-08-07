import cv2
import numpy as np
import base64
import xml.etree.ElementTree as ET
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

def process_svg(filename, out_name):
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
        if w > 80 and h > 80:
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
        
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    
    for idx, s in enumerate(sorted_slots):
        # draw bounding box
        x, y, w, h = s['x'], s['y'], s['width'], s['height']
        draw.rectangle([x, y, x+w, y+h], outline="red", width=5)
        
        # Draw index at center
        cx = x + w/2
        cy = y + h/2
        tw, th = 40, 40 
        draw.rectangle([cx - tw, cy - th, cx + tw, cy + th], fill="black")
        draw.text((cx - tw/2, cy - th/2), str(idx), fill="white", font=font)
        
    img.save(out_name)
    print(f"Generated {out_name}")

process_svg('a4-1-new.svg', 'a4-1-preview.png')
process_svg('a5-1-new.svg', 'a5-1-preview.png')
