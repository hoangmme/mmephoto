import cv2
import numpy as np

def check(filename):
    img = cv2.imread(filename, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Cannot read {filename}")
        return
    if img.shape[2] == 4:
        alpha = img[:, :, 3]
        # find bounding box of alpha > 0
        coords = cv2.findNonZero(alpha)
        x, y, w, h = cv2.boundingRect(coords)
        print(f"{filename} alpha bbox: x={x}, y={y}, w={w}, h={h}")
    else:
        print(f"{filename} has no alpha channel")

check('old_a4.png')
check('templates/a4-1.png')
