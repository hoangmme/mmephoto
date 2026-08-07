from PIL import Image

def process(color_png, mask_png, out_png, w, h):
    # Load color graphic and resize to target exactly
    img = Image.open(color_png).convert("RGBA")
    img = img.resize((w, h))
    
    # Load mask and resize to target exactly
    mask = Image.open(mask_png).convert("L")
    mask = mask.resize((w, h))
    
    # mask: holes are black (<128), frame is white (>128)
    mask = mask.point(lambda p: 255 if p > 128 else 0)
    
    # We want to keep the original alpha of the color graphic, BUT punch the holes
    # So new_alpha = min(orig_alpha, mask)
    r, g, b, orig_a = img.split()
    
    from PIL import ImageMath
    new_a = ImageMath.eval("convert(min(a, b), 'L')", a=orig_a, b=mask)
    
    img = Image.merge("RGBA", (r, g, b, new_a))
    img.save(out_png)
    print(f"Saved {out_png}")

process('test-color-a4.png', 'test-a4.png', 'templates/a4-1.png', 2480, 3507)
process('test-color-a5.png', 'test-a5.png', 'templates/a5-1.png', 1748, 2480)
