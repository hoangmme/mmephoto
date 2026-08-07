import cv2
import numpy as np

def make_clean_template(png_path, mask_path, out_path, w, h, dx, dy):
    img = cv2.imread(png_path)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    
    # Load binary mask
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)
    
    # Shift mask to align with PNG holes
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    shifted_mask = cv2.warpAffine(mask, M, (w, h), borderValue=255)
    
    # Inverted mask: 255 at holes, 0 at frame
    _, inv_mask = cv2.threshold(shifted_mask, 128, 255, cv2.THRESH_BINARY_INV)
    
    # 1. Dilate hole mask by 6 pixels (ellipse kernel 13x13)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    dilated_hole_mask = cv2.dilate(inv_mask, kernel_dilate, iterations=1)
    
    # 2. Detect green/greenish pixels in the image
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_green = np.array([12, 10, 10])
    upper_green = np.array([98, 255, 255])
    green_pixels = cv2.inRange(hsv, lower_green, upper_green)
    
    # 3. Only green pixels within 30px of hole mask should be punched
    search_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))
    search_zone = cv2.dilate(inv_mask, search_kernel, iterations=1)
    green_near_holes = cv2.bitwise_and(green_pixels, search_zone)
    
    # Combine: dilated hole mask + green pixels near holes
    final_hole_mask = cv2.bitwise_or(dilated_hole_mask, green_near_holes)
    
    # Create RGBA image with alpha=0 for holes, alpha=255 for frame
    alpha = cv2.bitwise_not(final_hole_mask)
    
    b, g, r = cv2.split(img)
    img_rgba = cv2.merge((b, g, r, alpha))
    
    cv2.imwrite(out_path, img_rgba)
    print(f"Saved clean template: {out_path}")

make_clean_template('a5-png-new.png', 'test-a4.png', 'templates/a4-1.png', 2480, 3507, 6, -6)
make_clean_template('a4-png-new.png', 'test-a5.png', 'templates/a5-1.png', 1748, 2480, -1, -1.5)
