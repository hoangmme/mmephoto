import cv2
import numpy as np

def detect(filename, target_w, target_h):
    img = cv2.imread(filename)
    if img is None: return
    img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    
    # In a5-png-new.png (A4), the hole average color is [203, 228, 206]
    # Let's create a mask for colors close to this
    lower_bound = np.array([190, 215, 190])
    upper_bound = np.array([215, 240, 220])
    
    mask = cv2.inRange(img, lower_bound, upper_bound)
    
    # Clean up the mask
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 100 and h > 100 and w < target_w * 0.9:
            cx = x + w / 2.0
            cy = y + h / 2.0
            slots.append({'x': x, 'y': y, 'w': w, 'h': h, 'cx': cx, 'cy': cy})
            
    print(f"Detected {len(slots)} colored holes in {filename}")
    
    # Save a debug image
    out = img.copy()
    out[mask == 255] = [0, 0, 255]
    for s in slots:
        cv2.rectangle(out, (s['x'], s['y']), (s['x']+s['w'], s['y']+s['h']), (0, 255, 0), 3)
    cv2.imwrite(filename + "_holes.png", out)

detect('a5-png-new.png', 2480, 3507)
