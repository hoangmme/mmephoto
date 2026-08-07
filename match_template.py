import cv2
import numpy as np

def find_match(png_file, mask_file, w, h):
    # Load PNG and get its white regions
    img = cv2.imread(png_file)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, img_thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
    
    # Load mask and get its black holes
    mask = cv2.imread(mask_file, cv2.IMREAD_GRAYSCALE)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LANCZOS4)
    _, mask_thresh = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY_INV) # Holes are 255
    
    # Now we have img_thresh (white regions = 255) and mask_thresh (holes = 255)
    # We want to find the offset that maximizes their intersection.
    # Since they should be similar in size, we can use matchTemplate or phaseCorrelate.
    
    # Using phaseCorrelate for fast translation matching
    img_float = np.float32(img_thresh)
    mask_float = np.float32(mask_thresh)
    shift, response = cv2.phaseCorrelate(mask_float, img_float)
    
    print(f"{png_file} vs {mask_file}: shift (x, y) = {shift}, response = {response}")
    
    # Let's apply the shift to the mask and save an overlay
    M = np.float32([[1, 0, shift[0]], [0, 1, shift[1]]])
    shifted_mask = cv2.warpAffine(mask_thresh, M, (w, h))
    
    # Draw overlay: original image + red for shifted mask holes
    out = img.copy()
    out[shifted_mask == 255] = [0, 0, 255]
    cv2.imwrite(png_file + "_matched.png", out)

find_match('a5-png-new.png', 'test-a4.png', 2480, 3507)
find_match('a4-png-new.png', 'test-a5.png', 1748, 2480)
