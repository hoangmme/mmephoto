from PIL import Image

def check(filename):
    img = Image.open(filename)
    print(f"{filename} mode: {img.mode}, size: {img.size}")
    if img.mode != 'RGBA':
        print(f"  Warning: No alpha channel in {filename}")

check('a4-png-new.png')
check('a5-png-new.png')
