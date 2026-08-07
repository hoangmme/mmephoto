import cv2
import numpy as np
import json

def extract_heart_clip(mask_file, canvas_w, canvas_h, slot_cx, slot_cy, slot_w, slot_h, label, dx=0, dy=0):
    """Extract heart contour from mask PNG for a specific slot."""
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (canvas_w, canvas_h), interpolation=cv2.INTER_LANCZOS4)
    _, mask_bin = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY_INV)
    
    # Apply shift (same as in template generation)
    if dx != 0 or dy != 0:
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        mask_bin = cv2.warpAffine(mask_bin, M, (canvas_w, canvas_h), borderValue=0)
    
    # Crop ROI around slot with margin
    margin = 20
    x1 = max(0, int(slot_cx - slot_w/2) - margin)
    y1 = max(0, int(slot_cy - slot_h/2) - margin)
    x2 = min(canvas_w, int(slot_cx + slot_w/2) + margin)
    y2 = min(canvas_h, int(slot_cy + slot_h/2) + margin)
    
    roi = mask_bin[y1:y2, x1:x2]
    
    contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        print(f"  {label}: No contours found!")
        return None
    
    # Find the contour closest to slot center
    best_cnt = None
    best_dist = 999999
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 100:
            continue
        M_cnt = cv2.moments(cnt)
        if M_cnt["m00"] == 0:
            continue
        cx_cnt = M_cnt["m10"] / M_cnt["m00"] + x1
        cy_cnt = M_cnt["m01"] / M_cnt["m00"] + y1
        dist = ((cx_cnt - slot_cx)**2 + (cy_cnt - slot_cy)**2)**0.5
        if dist < best_dist:
            best_dist = dist
            best_cnt = cnt
    
    if best_cnt is None:
        print(f"  {label}: No valid contour!")
        return None
    
    area = cv2.contourArea(best_cnt)
    print(f"  {label}: area={area:.0f}, points={len(best_cnt)}, dist={best_dist:.1f}")
    
    # Simplify contour
    epsilon = 0.003 * cv2.arcLength(best_cnt, True)
    approx = cv2.approxPolyDP(best_cnt, epsilon, True)
    print(f"  {label}: simplified to {len(approx)} points")
    
    # Convert to clipPath relative to slot center
    path_parts = []
    for i, pt in enumerate(approx):
        px = pt[0][0] + x1 - slot_cx
        py = pt[0][1] + y1 - slot_cy
        if i == 0:
            path_parts.append(f"M {px:.1f} {py:.1f}")
        else:
            path_parts.append(f"L {px:.1f} {py:.1f}")
    path_parts.append("Z")
    
    return " ".join(path_parts)


# ============================================================
# A4 template (a4-1): mask=test-a4.png, canvas=2480x3507, shift dx=6, dy=-6
# Hearts: slots 0, 1, 2
# ============================================================
print("=== A4 template hearts (slots 0, 1, 2) ===")
a4_hearts = [
    {"slot": 0, "cx": 270.0, "cy": 290.0, "w": 350.0, "h": 358.0},
    {"slot": 1, "cx": 575.5, "cy": 289.5, "w": 351.0, "h": 357.0},
    {"slot": 2, "cx": 904.0, "cy": 289.5, "w": 394.0, "h": 357.0},
]

a4_clips = {}
for s in a4_hearts:
    clip = extract_heart_clip("test-a4.png", 2480, 3507, s["cx"], s["cy"], s["w"], s["h"],
                               f"slot_a4_{s['slot']}", dx=6, dy=-6)
    if clip:
        a4_clips[s['slot']] = clip
        print(f"  clipPath ({len(clip)} chars)")

# ============================================================
# A5 template (a5-1): mask=test-a5.png, canvas=1748x2480, shift dx=-1, dy=-1.5
# Hearts: slots 10, 11, 12
# ============================================================
print("\n=== A5 template hearts (slots 10, 11, 12) ===")
a5_hearts = [
    {"slot": 10, "cx": 925.0, "cy": 1523.5, "w": 324.0, "h": 333.0},
    {"slot": 11, "cx": 1208.0, "cy": 1523.5, "w": 324.0, "h": 333.0},
    {"slot": 12, "cx": 1514.5, "cy": 1523.5, "w": 369.0, "h": 333.0},
]

a5_clips = {}
for s in a5_hearts:
    clip = extract_heart_clip("test-a5.png", 1748, 2480, s["cx"], s["cy"], s["w"], s["h"],
                               f"slot_a5_{s['slot']}", dx=-1, dy=-1.5)
    if clip:
        a5_clips[s['slot']] = clip
        print(f"  clipPath ({len(clip)} chars)")

# Save to JSON
with open('heart_clips.json', 'w') as f:
    json.dump({'a4': {str(k): v for k,v in a4_clips.items()},
               'a5': {str(k): v for k,v in a5_clips.items()}}, f, indent=2)

print("\nSaved to heart_clips.json")
print(f"\nA4: {len(a4_clips)} clips, A5: {len(a5_clips)} clips")
