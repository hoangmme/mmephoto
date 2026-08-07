from PIL import Image

def check(filename):
    img = Image.open(filename).convert("RGBA")
    r, g, b, a = img.getpixel((434, 363))
    print(f"{filename} hole pixel (434, 363) RGBA: {r}, {g}, {b}, {a}")
    r, g, b, a = img.getpixel((0, 0))
    print(f"{filename} corner pixel (0, 0) RGBA: {r}, {g}, {b}, {a}")

check('templates/a4-1.png')
