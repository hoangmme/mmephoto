import cv2
import numpy as np
import json

def refine(png_file, target_w, target_h, old_slots):
    img = cv2.imread(png_file)
    img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    
    new_slots = []
    for s in old_slots:
        x, y, w, h = s['x'], s['y'], s['w'], s['h']
        # expand ROI slightly to catch shifts
        pad = 30
        roi_x = max(0, x - pad)
        roi_y = max(0, y - pad)
        roi_w = min(target_w - roi_x, w + 2*pad)
        roi_h = min(target_h - roi_y, h + 2*pad)
        
        roi = thresh[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
        
        # Find the largest contour in the ROI
        contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            print(f"Warning: No contour found for slot at {x},{y}")
            new_slots.append(s)
            continue
            
        largest = max(contours, key=cv2.contourArea)
        rx, ry, rw, rh = cv2.boundingRect(largest)
        
        # Calculate new absolute coordinates
        new_x = roi_x + rx
        new_y = roi_y + ry
        new_w = rw
        new_h = rh
        new_cx = new_x + new_w / 2.0
        new_cy = new_y + new_h / 2.0
        
        # Ensure we didn't just pick up a tiny speck of noise
        if rw < 50 or rh < 50:
            print(f"Warning: Contour too small for slot at {x},{y}")
            new_slots.append(s)
            continue
            
        new_s = s.copy()
        new_s.update({'x': new_x, 'y': new_y, 'w': new_w, 'h': new_h, 'cx': new_cx, 'cy': new_cy})
        new_slots.append(new_s)
        
    return new_slots

# Let's extract the old slots for A4 and A5 from pl-globals.js
import re
with open('js/modules/pl-globals.js', 'r') as f:
    js_content = f.read()

# We can parse the slots array using regex or simple script
def parse_slots(text, start_marker, end_marker):
    start = text.find(start_marker)
    end = text.find(end_marker, start)
    return text[start:end]

# It's easier to just read the mask holes since they were the source of truth!
def get_mask_slots(mask_file, target_w, target_h):
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 100 and h > 100 and w < target_w * 0.9:
            slots.append({'x': x, 'y': y, 'w': w, 'h': h})
            
    # sort loosely top to bottom, left to right
    slots.sort(key=lambda s: (s['y'] // 150, s['x']))
    return slots

old_a4 = get_mask_slots('test-a4.png', 2480, 3507)
new_a4 = refine('a5-png-new.png', 2480, 3507, old_a4)

print("A4 Differences (New - Old):")
for o, n in zip(old_a4, new_a4):
    print(f"  dx={n['x']-o['x']}, dy={n['y']-o['y']}, dw={n['w']-o['w']}, dh={n['h']-o['h']}")

