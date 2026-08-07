import cv2
import numpy as np

def detect(filename, target_w, target_h):
    img = cv2.imread(filename)
    if img is None:
        return
    img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    # Filter out contours that are too small or too large
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 200 and h > 200 and w < target_w * 0.9 and h < target_h * 0.9:
            cx = x + w / 2.0
            cy = y + h / 2.0
            slots.append({'x': x, 'y': y, 'w': w, 'h': h, 'cx': cx, 'cy': cy})
            
    # Sort them top-to-bottom, left-to-right loosely
    slots.sort(key=lambda s: (s['y'] // 150, s['x']))
    
    print(f"Slots in {filename}:")
    for i, s in enumerate(slots):
        print(f"  Slot {i}: cx={s['cx']}, cy={s['cy']}, w={s['w']}, h={s['h']}")

detect('a5-png-new.png', 2480, 3507)
