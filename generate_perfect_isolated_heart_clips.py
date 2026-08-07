import cv2
import numpy as np
import json

def get_isolated_slot_contour(img_path, slot_cx, slot_cy, slot_w, slot_h, label):
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    hole_mask = (alpha < 128).astype(np.uint8) * 255
    
    margin = 40
    x1 = max(0, int(slot_cx - slot_w/2) - margin)
    y1 = max(0, int(slot_cy - slot_h/2) - margin)
    x2 = min(img.shape[1], int(slot_cx + slot_w/2) + margin)
    y2 = min(img.shape[0], int(slot_cy + slot_h/2) + margin)
    
    roi = hole_mask[y1:y2, x1:x2]
    contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_cnts = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 500: continue
        M = cv2.moments(cnt)
        if M['m00'] == 0: continue
        cx_cnt = M['m10'] / M['m00'] + x1
        cy_cnt = M['m01'] / M['m00'] + y1
        
        dist = np.hypot(cx_cnt - slot_cx, cy_cnt - slot_cy)
        # Strictly only keep contours within 50px of slot center
        if dist < 50.0:
            best_cnts.append((dist, cnt))
            
    if not best_cnts:
        print(f"  {label}: No contour within 50px!")
        return None
        
    # Sort by dist
    best_cnts.sort(key=lambda x: x[0])
    
    # Take the main contour for this slot
    cnt = best_cnts[0][1]
    
    epsilon = 0.003 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)
    
    parts = []
    for i, pt in enumerate(approx):
        px = pt[0][0] + x1 - slot_cx
        py = pt[0][1] + y1 - slot_cy
        c_name = 'M' if i == 0 else 'L'
        parts.append(f"{c_name} {px:.1f} {py:.1f}")
    parts.append("Z")
    
    clip_str = " ".join(parts)
    print(f"  {label}: extracted PERFECT isolated clip ({len(clip_str)} chars), dist={best_cnts[0][0]:.1f}px")
    return clip_str

# A4 3 hearts
a4_clips = {
    0: get_isolated_slot_contour('templates/a4-1.png', 264.0, 293.5, 350.0, 359.0, 'a4 slot 0'),
    1: get_isolated_slot_contour('templates/a4-1.png', 570.0, 293.0, 350.0, 358.0, 'a4 slot 1'),
    2: get_isolated_slot_contour('templates/a4-1.png', 898.0, 293.0, 394.0, 358.0, 'a4 slot 2')
}

# A5 3 hearts
a5_clips = {
    10: get_isolated_slot_contour('templates/a5-1.png', 927.0, 1525.0, 324.0, 332.0, 'a5 slot 10'),
    11: get_isolated_slot_contour('templates/a5-1.png', 1210.5, 1525.0, 325.0, 332.0, 'a5 slot 11'),
    12: get_isolated_slot_contour('templates/a5-1.png', 1517.0, 1525.0, 370.0, 332.0, 'a5 slot 12')
}

with open('perfect_isolated_heart_clips.json', 'w') as f:
    json.dump({'a4': a4_clips, 'a5': a5_clips}, f, indent=2)

