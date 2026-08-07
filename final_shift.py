import cv2
import numpy as np

def process(png_file, mask_file, out_file, w, h, dx, dy):
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY) 
    
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    shifted_mask = cv2.warpAffine(mask, M, (w, h), borderValue=255)
    
    alpha = shifted_mask
    b, g, r = cv2.split(img)
    img_rgba = cv2.merge((b, g, r, alpha))
    cv2.imwrite(out_file, img_rgba)
    
    _, inv_mask = cv2.threshold(shifted_mask, 128, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(inv_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    slots = []
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw > 80 and bh > 80 and bw < w * 0.9:
            slots.append({'x': x, 'y': y, 'w': bw, 'h': bh})
            
    # VERY IMPORTANT: To maintain slot IDs, we must sort them EXACTLY how they were sorted in the original SVG mask extraction!
    # Original SVG extraction script (generate_all_slots.py) used:
    # return sorted(rects, key=lambda b: b[1])  -> WHICH IS STRICTLY BY Y COORDINATE!
    slots.sort(key=lambda b: b['y'])
    
    return slots

def compare_and_print(name, new_slots, js_file, prefix):
    # This just prints for verification. We will do exact updating later.
    print(f"{name}: found {len(new_slots)} slots.")

a4_slots = process('a5-png-new.png', 'test-a4.png', 'templates/a4-1.png', 2480, 3507, 6, -6)
a5_slots = process('a4-png-new.png', 'test-a5.png', 'templates/a5-1.png', 1748, 2480, -1, -1.5)

print(f"A4 count: {len(a4_slots)}, A5 count: {len(a5_slots)}")
for i, s in enumerate(a5_slots):
    print(f"A5 slot {i}: w={s['w']}, h={s['h']}")
