import cv2
import numpy as np

def detect(filename, target_w, target_h, out_file):
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
            # Also check if it's somewhat rectangular or a blob
            slots.append({'x': x, 'y': y, 'w': w, 'h': h, 'cnt': cnt})
            
    # Sort them top-to-bottom, left-to-right loosely
    slots.sort(key=lambda s: (s['y'] // 150, s['x']))
    
    # Draw them
    for i, s in enumerate(slots):
        x, y, w, h = s['x'], s['y'], s['w'], s['h']
        cv2.rectangle(img, (x, y), (x+w, y+h), (0, 0, 255), 5)
        cv2.putText(img, str(i), (x + 10, y + 50), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 5)
        
    cv2.imwrite(out_file, img)
    print(f"Detected {len(slots)} slots in {filename}, saved {out_file}")

detect('a5-png-new.png', 2480, 3507, 'debug_a4.png')
detect('a4-png-new.png', 1748, 2480, 'debug_a5.png')
