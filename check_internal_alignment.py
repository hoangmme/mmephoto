import cv2
import numpy as np

def check():
    # Load color graphic from SVG
    img = cv2.imread('test-color-a4.png')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, img_thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
    
    # Load mask from SVG
    mask = cv2.imread('test-a4.png', cv2.IMREAD_GRAYSCALE)
    _, mask_thresh = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY_INV)
    
    img_float = np.float32(img_thresh)
    mask_float = np.float32(mask_thresh)
    shift, response = cv2.phaseCorrelate(mask_float, img_float)
    
    print(f"Internal alignment: shift = {shift}, response = {response}")

check()
