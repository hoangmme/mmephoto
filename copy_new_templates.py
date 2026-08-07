import cv2

# A4 template -> 2480 x 3507
img_a4 = cv2.imread('frame/A4-tag-a4.png', cv2.IMREAD_UNCHANGED)
img_a4_resized = cv2.resize(img_a4, (2480, 3507), interpolation=cv2.INTER_AREA)
cv2.imwrite('templates/a4-1.png', img_a4_resized)
print(f"Saved templates/a4-1.png: shape={img_a4_resized.shape}")

# A5 template -> 1748 x 2480
img_a5 = cv2.imread('frame/A5-tag-a5.png', cv2.IMREAD_UNCHANGED)
img_a5_resized = cv2.resize(img_a5, (1748, 2480), interpolation=cv2.INTER_AREA)
cv2.imwrite('templates/a5-1.png', img_a5_resized)
print(f"Saved templates/a5-1.png: shape={img_a5_resized.shape}")

# template-3 -> 2480 x 3507
img_t3 = cv2.imread('frame/template-3-tag-a5.png', cv2.IMREAD_UNCHANGED)
img_t3_resized = cv2.resize(img_t3, (2480, 3507), interpolation=cv2.INTER_AREA)
cv2.imwrite('templates/template-3.png', img_t3_resized)
print(f"Saved templates/template-3.png: shape={img_t3_resized.shape}")

# template-4 -> 2480 x 3507
img_t4 = cv2.imread('frame/template-4-tag-a5.png', cv2.IMREAD_UNCHANGED)
img_t4_resized = cv2.resize(img_t4, (2480, 3507), interpolation=cv2.INTER_AREA)
cv2.imwrite('templates/template-4.png', img_t4_resized)
print(f"Saved templates/template-4.png: shape={img_t4_resized.shape}")

