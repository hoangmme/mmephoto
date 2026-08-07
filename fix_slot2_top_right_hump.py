import cv2
import numpy as np

def punch_slot2_top_right(png_path, slot_name, rois):
    img = cv2.imread(png_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    b, g, r = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    
    punched = 0
    for x1, y1, x2, y2 in rois:
        roi_b = b[y1:y2, x1:x2]
        roi_g = g[y1:y2, x1:x2]
        roi_r = r[y1:y2, x1:x2]
        roi_a = alpha[y1:y2, x1:x2]
        
        # Punch light pixels (white/pink) strictly above/behind the tag
        is_light = (roi_r > 160) & (roi_g > 160) & (roi_b > 160) & (roi_a > 128)
        
        roi_a[is_light] = 0
        alpha[y1:y2, x1:x2] = roi_a
        punched += np.count_nonzero(is_light)
        
    img[:, :, 3] = alpha
    cv2.imwrite(png_path, img)
    print(f"{slot_name}: Punched {punched} pixels in top right hump of slot 2 / 12!")

# ROIs for top right hump of slot 2 A4 (2480 x 3507)
# x: 920..1060, y: 110..180
a4_rois_slot2 = [(920, 110, 1060, 180)]

# ROIs for top right hump of slot 12 A5 (1748 x 2480)
# x: 1540..1680, y: 1350..1415
a5_rois_slot12 = [(1540, 1350, 1680, 1415)]

punch_slot2_top_right('templates/a4-1.png', 'A4 Template Slot 2', a4_rois_slot2)
punch_slot2_top_right('templates/a5-1.png', 'A5 Template Slot 12', a5_rois_slot12)
