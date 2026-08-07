import cv2
import numpy as np
import json

def get_exact_slot_subpaths(img_path, slot_cx, slot_cy, slot_w, slot_h, min_x_bound, max_x_bound, label):
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    hole_mask = (alpha < 128).astype(np.uint8) * 255
    
    margin = 50
    x1 = max(0, int(slot_cx - slot_w/2) - margin)
    y1 = max(0, int(slot_cy - slot_h/2) - margin)
    x2 = min(img.shape[1], int(slot_cx + slot_w/2) + margin)
    y2 = min(img.shape[0], int(slot_cy + slot_h/2) + margin)
    
    roi = hole_mask[y1:y2, x1:x2]
    contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    valid_subpaths = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 100: continue
        M = cv2.moments(cnt)
        if M['m00'] == 0: continue
        cx_cnt = M['m10'] / M['m00'] + x1
        cy_cnt = M['m01'] / M['m00'] + y1
        
        dist = np.hypot(cx_cnt - slot_cx, cy_cnt - slot_cy)
        
        # Check if contour is main body (dist < 60) OR top hump within X-bounds
        is_main_body = (dist < 60.0)
        is_top_hump = (cy_cnt < slot_cy - 100.0) and (min_x_bound <= cx_cnt <= max_x_bound)
        
        if is_main_body or is_top_hump:
            epsilon = 0.003 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            
            parts = []
            for i, pt in enumerate(approx):
                px = pt[0][0] + x1 - slot_cx
                py = pt[0][1] + y1 - slot_cy
                c_name = 'M' if i == 0 else 'L'
                parts.append(f"{c_name} {px:.1f} {py:.1f}")
            parts.append("Z")
            valid_subpaths.append(" ".join(parts))
            print(f"  {label}: kept sub-path at center=({cx_cnt:.1f}, {cy_cnt:.1f}), dist={dist:.1f}px, area={area:.0f}")
        else:
            print(f"  {label}: ignored adjacent contour at center=({cx_cnt:.1f}, {cy_cnt:.1f}), dist={dist:.1f}px")
            
    compound_clip = " ".join(valid_subpaths)
    print(f"  {label}: FINAL clip with {len(valid_subpaths)} sub-paths ({len(compound_clip)} chars)\n")
    return compound_clip

print("=== Extracting A4 Heart Slots ===")
# A4 slots X bounds:
# Slot 0: min_x=50, max_x=420
# Slot 1: min_x=420, max_x=730
# Slot 2: min_x=730, max_x=1050
a4_clips = {
    0: get_exact_slot_subpaths('templates/a4-1.png', 264.0, 293.5, 350.0, 359.0, 50, 420, 'a4 slot 0'),
    1: get_exact_slot_subpaths('templates/a4-1.png', 570.0, 293.0, 350.0, 358.0, 420, 730, 'a4 slot 1'),
    2: get_exact_slot_subpaths('templates/a4-1.png', 898.0, 293.0, 394.0, 358.0, 730, 1050, 'a4 slot 2')
}

print("=== Extracting A5 Heart Slots ===")
# A5 slots X bounds:
# Slot 10: min_x=750, max_x=1060
# Slot 11: min_x=1060, max_x=1360
# Slot 12: min_x=1360, max_x=1700
a5_clips = {
    10: get_exact_slot_subpaths('templates/a5-1.png', 927.0, 1525.0, 324.0, 332.0, 750, 1060, 'a5 slot 10'),
    11: get_exact_slot_subpaths('templates/a5-1.png', 1210.5, 1525.0, 325.0, 332.0, 1060, 1360, 'a5 slot 11'),
    12: get_exact_slot_subpaths('templates/a5-1.png', 1517.0, 1525.0, 370.0, 332.0, 1360, 1700, 'a5 slot 12')
}

with open('exact_multi_subpath_clips.json', 'w') as f:
    json.dump({'a4': a4_clips, 'a5': a5_clips}, f, indent=2)

