from PIL import Image, ImageMath

def process(chrome_png, mask_png, out_png, w, h):
    img = Image.open(chrome_png).convert("RGBA")
    mask = Image.open(mask_png).convert("L")
    mask = mask.resize((w, h))
    
    # mask: holes are black (<128), frame is white (>128)
    mask = mask.point(lambda p: 255 if p > 128 else 0)
    
    r, g, b, orig_a = img.split()
    
    # new_a = min(orig_a, mask) -> wait, PIL ImageMath or just simple composite
    # the easiest way is to use orig_a and mask and take the minimum pixel by pixel
    new_a = ImageMath.eval("convert(min(a, b), 'L')", a=orig_a, b=mask)
    
    img = Image.merge("RGBA", (r, g, b, new_a))
    img.save(out_png)
    print(f"Saved {out_png}")

process('a4_chrome.png', 'test-a4.png', 'templates/a4-1.png', 2480, 3507)
process('a5_chrome.png', 'test-a5.png', 'templates/a5-1.png', 1748, 2480)
