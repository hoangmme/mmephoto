from PIL import Image
import numpy as np

img = Image.open('templates/a5-1.png')
arr = np.array(img)

# The accidental transparent hole is in box Y: 1350..1450, X: 1540..1695
# Let's inspect the exact boundaries of where alpha == 0 in that region that are OUTSIDE the heart cutout.
# Note: The heart cutout itself is centered around cx=1517, cy=1525, with radius ~180.
# The top-right curve of the 3rd heart border is around X=1540..1650, Y=1450..1500.
# So the box Y: 1350..1450, X: 1540..1695 is ENTIRELY OUTSIDE the heart cutout (it is in the background area above the heart border).

# We can fill the alpha == 0 pixels in Y: 1350..1450, X: 1540..1695 with the background pattern from neighboring Y: 1250..1350, X: 1540..1695!
patch_bg = arr[1250:1350, 1540:1695].copy() # 100x155 block directly above

# Fill the hole region with the patch_bg
arr[1350:1450, 1540:1695] = patch_bg

repaired_img = Image.fromarray(arr)
repaired_img.save('templates/a5-1.png')
print("Successfully repaired transparent hole in templates/a5-1.png!")

