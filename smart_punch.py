import cv2
import numpy as np

def process(png_file, out_file, w, h):
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    
    # Use RETR_LIST to get all contours (including internal holes)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    mask = np.zeros_like(gray)
    slots = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        x, y, bw, bh = cv2.boundingRect(cnt)
        
        # A photo slot is typically large. Area > 5000.
        # Exclude the entire image background if it's white
        if area > 5000 and bw < w * 0.95 and bh < h * 0.95:
            # Draw this contour filled onto the mask
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            cx = x + bw / 2.0
            cy = y + bh / 2.0
            slots.append({'x': x, 'y': y, 'w': bw, 'h': bh, 'cx': cx, 'cy': cy, 'area': area})
            
    alpha = cv2.bitwise_not(mask)
    b, g, r = cv2.split(img)
    img_rgba = cv2.merge((b, g, r, alpha))
    cv2.imwrite(out_file, img_rgba)
    
    print(f"Processed {png_file} -> {out_file}, found {len(slots)} holes.")
    slots.sort(key=lambda s: (s['cy'] // 150, s['cx']))
    for i, s in enumerate(slots):
        print(f"Slot {i}: cx={s['cx']}, cy={s['cy']}, w={s['w']}, h={s['h']}")

process('a5-png-new.png', 'templates/a4-1.png', 2480, 3507)
process('a4-png-new.png', 'templates/a5-1.png', 1748, 2480)
