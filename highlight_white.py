import cv2
import numpy as np

def check(filename, out):
    img = cv2.imread(filename)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
    img[thresh == 255] = [0, 0, 255]
    cv2.imwrite(out, img)

check('a5-png-new.png', 'white_a4.png')
check('a4-png-new.png', 'white_a5.png')
