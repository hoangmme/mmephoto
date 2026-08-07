import cv2
import numpy as np

def check(png_file, mask_file, w, h):
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)
    
    # Check pixels where mask == 0 (holes)
    hole_pixels = img[mask == 0]
    
    # What is the average color of hole pixels?
    avg_color = np.mean(hole_pixels, axis=0)
    print(f"{png_file} hole average color: {avg_color}")
    
    # Are there any non-white pixels in the holes?
    # Actually, Lanczos might blur edges, but mostly they should be > 240
    non_white = np.sum(np.any(hole_pixels < 240, axis=-1))
    print(f"{png_file} non-white pixels in holes: {non_white} out of {len(hole_pixels)}")

check('a5-png-new.png', 'test-a4.png', 2480, 3507)
check('a4-png-new.png', 'test-a5.png', 1748, 2480)
