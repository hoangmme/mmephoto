import cv2
import numpy as np

def check(filename):
    img = cv2.imread(filename)
    if img is None: return
    # Find the most common color in the image, or just sample a point
    print(f"{filename} center pixel: {img[1000, 700]}")
    # Let's find unique colors in the image and their counts
    unique, counts = np.unique(img.reshape(-1, 3), axis=0, return_counts=True)
    # Get top 5 colors
    top5 = sorted(zip(unique, counts), key=lambda x: x[1], reverse=True)[:5]
    print(f"{filename} top 5 colors:")
    for color, count in top5:
        print(f"  {color}: {count}")

check('a5-png-new.png')
check('a4-png-new.png')
