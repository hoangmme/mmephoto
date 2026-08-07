import cv2
import numpy as np

def punch_humps_for_template(template_path, heart_rois, name):
    img = cv2.imread(template_path, cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    b, g, r = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    
    punched_count = 0
    
    for x1, y1, x2, y2 in heart_rois:
        roi_b = b[y1:y2, x1:x2]
        roi_g = g[y1:y2, x1:x2]
        roi_r = r[y1:y2, x1:x2]
        roi_alpha = alpha[y1:y2, x1:x2]
        
        # White or light-pink fill inside the top humps above tag
        # (white/pink fill pixels: B > 180, G > 180, R > 180 or light pink)
        is_light = (roi_r > 170) & (roi_g > 170) & (roi_b > 170) & (roi_alpha > 128)
        
        # Exclude brown stroke lines (brown stroke has lower RGB, e.g. R<150 or G<120)
        # Exclude black text ('A gentle forever' text has low RGB)
        # We flood fill from known transparent area or make light pixels in the top hump transparent
        
        # Make light pixels transparent
        roi_alpha[is_light] = 0
        punched_count += np.count_nonzero(is_light)
        alpha[y1:y2, x1:x2] = roi_alpha
        
    img[:, :, 3] = alpha
    cv2.imwrite(template_path, img)
    print(f"{name}: punched {punched_count} white hump pixels to transparent!")

# ROIs for top humps of 3 hearts in A4 template (2480 x 3507)
# Slot 0 (x: 180..420, y: 110..220)
# Slot 1 (x: 480..700, y: 110..220)
# Slot 2 (x: 800..1020, y: 110..220)
a4_rois = [
    (180, 110, 420, 220),
    (480, 110, 700, 220),
    (800, 110, 1020, 220)
]

# ROIs for top humps of 3 hearts in A5 template (1748 x 2480)
# Slot 10 (x: 840..1010, y: 1350..1440)
# Slot 11 (x: 1120..1290, y: 1350..1440)
# Slot 12 (x: 1430..1600, y: 1350..1440)
a5_rois = [
    (840, 1350, 1010, 1440),
    (1120, 1350, 1290, 1440),
    (1430, 1350, 1600, 1440)
]

punch_humps_for_template('templates/a4-1.png', a4_rois, 'A4 Template')
punch_humps_for_template('templates/a5-1.png', a5_rois, 'A5 Template')
