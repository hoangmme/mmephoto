import cv2
import numpy as np

def punch_only_humps_above_tag(png_path, slot_name):
    img = cv2.imread(png_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    b, g, r = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    
    # For A4 template (2480 x 3507) slot 0, 1, 2:
    # Tag 'A gentle forever' box top edge is around y = 175 in slot 0.
    # The humps above the tag are in y: 114..175, x: 200..400.
    # Let's inspect BGR of the tag border vs hump fill.
    
    # We punch light pixels (white/pink fill) strictly in the region ABOVE the tag box top border.
    # For slot 0 (A4): y from 110 to 172, x from 190 to 410
    # For slot 1 (A4): y from 110 to 172, x from 490 to 700
    # For slot 2 (A4): y from 110 to 172, x from 810 to 1010
    
    rois = []
    if 'a4' in png_path:
        rois = [
            (190, 110, 410, 172), # Slot 0 top humps above tag
            (490, 110, 700, 172), # Slot 1 top humps above tag
            (810, 110, 1010, 172) # Slot 2 top humps above tag
        ]
    elif 'a5' in png_path:
        rois = [
            (850, 1350, 1000, 1395),  # Slot 10 top humps above tag
            (1130, 1350, 1280, 1395), # Slot 11 top humps above tag
            (1440, 1350, 1590, 1395)  # Slot 12 top humps above tag
        ]
        
    punched = 0
    for x1, y1, x2, y2 in rois:
        roi_b = b[y1:y2, x1:x2]
        roi_g = g[y1:y2, x1:x2]
        roi_r = r[y1:y2, x1:x2]
        roi_a = alpha[y1:y2, x1:x2]
        
        # Light pixels (white/pink) inside hump
        is_light = (roi_r > 160) & (roi_g > 160) & (roi_b > 160) & (roi_a > 128)
        
        roi_a[is_light] = 0
        alpha[y1:y2, x1:x2] = roi_a
        punched += np.count_nonzero(is_light)
        
    img[:, :, 3] = alpha
    cv2.imwrite(png_path, img)
    print(f"{slot_name}: Punched {punched} pixels strictly ABOVE the tag box!")

punch_only_humps_above_tag('templates/a4-1.png', 'A4 Template')
punch_only_humps_above_tag('templates/a5-1.png', 'A5 Template')
