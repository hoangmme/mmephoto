import cv2
import numpy as np
import json

def get_compound_contour_clip(img_path, slot_cx, slot_cy, slot_w, slot_h, label):
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    hole_mask = (alpha < 128).astype(np.uint8) * 255
    
    # Crop ROI around slot
    margin = 40
    x1 = max(0, int(slot_cx - slot_w/2) - margin)
    y1 = max(0, int(slot_cy - slot_h/2) - margin)
    x2 = min(img.shape[1], int(slot_cx + slot_w/2) + margin)
    y2 = min(img.shape[0], int(slot_cy + slot_h/2) + margin)
    
    roi = hole_mask[y1:y2, x1:x2]
    
    contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        print(f"  {label}: No contour found!")
        return None
        
    sub_paths = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 100: continue # Skip noise
        
        epsilon = 0.003 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        parts = []
        for i, pt in enumerate(approx):
            px = pt[0][0] + x1 - slot_cx
            py = pt[0][1] + y1 - slot_cy
            c_name = 'M' if i == 0 else 'L'
            parts.append(f"{c_name} {px:.1f} {py:.1f}")
        parts.append("Z")
        sub_parts = " ".join(parts)
        sub_paths.append(sub_parts)
        
    compound_clip = " ".join(sub_paths)
    print(f"  {label}: extracted compound clip with {len(sub_paths)} sub-paths ({len(compound_clip)} chars)")
    return compound_clip

# Restore pristine templates from /frame first to be 100% clean
img_a4 = cv2.resize(cv2.imread('frame/A4-tag-a4.png', cv2.IMREAD_UNCHANGED), (2480, 3507), interpolation=cv2.INTER_AREA)
img_a5 = cv2.resize(cv2.imread('frame/A5-tag-a5.png', cv2.IMREAD_UNCHANGED), (1748, 2480), interpolation=cv2.INTER_AREA)
cv2.imwrite('templates/a4-1.png', img_a4)
cv2.imwrite('templates/a5-1.png', img_a5)

# Extract compound clips
a4_clips = {
    0: get_compound_contour_clip('templates/a4-1.png', 264.0, 293.5, 350.0, 359.0, 'a4 slot 0'),
    1: get_compound_contour_clip('templates/a4-1.png', 570.0, 293.0, 350.0, 358.0, 'a4 slot 1'),
    2: get_compound_contour_clip('templates/a4-1.png', 898.0, 293.0, 394.0, 358.0, 'a4 slot 2')
}

a5_clips = {
    10: get_compound_contour_clip('templates/a5-1.png', 927.0, 1525.0, 324.0, 332.0, 'a5 slot 10'),
    11: get_compound_contour_clip('templates/a5-1.png', 1210.5, 1525.0, 325.0, 332.0, 'a5 slot 11'),
    12: get_compound_contour_clip('templates/a5-1.png', 1517.0, 1525.0, 370.0, 332.0, 'a5 slot 12')
}

with open('compound_heart_clips.json', 'w') as f:
    json.dump({'a4': a4_clips, 'a5': a5_clips}, f, indent=2)

