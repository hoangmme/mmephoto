import cv2
import numpy as np

def check_match(png_file, mask_file, out_file, w, h):
    # Load and resize exact png
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    # Load and resize mask
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)
    
    # In mask, 0 is hole, 255 is frame.
    # We want to see if the holes (mask=0) match the white areas of the PNG.
    # Let's paint the holes in the PNG RED.
    img[mask == 0] = [0, 0, 255]
    
    cv2.imwrite(out_file, img)
    print(f"Saved {out_file}")

check_match('a5-png-new.png', 'test-a4.png', 'match_a4.png', 2480, 3507)
check_match('a4-png-new.png', 'test-a5.png', 'match_a5.png', 1748, 2480)
