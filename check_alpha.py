from PIL import Image

def check(filename):
    img = Image.open(filename)
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        print(f"{filename} has transparency")
    else:
        print(f"{filename} has NO transparency (mode: {img.mode})")

check('a4-1-new.svg.png')
check('a5-1-new.svg.png')
