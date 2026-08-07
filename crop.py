from PIL import Image
def crop_to_bbox(filename, out):
    img = Image.open(filename)
    bbox = img.getbbox()
    if bbox:
        print(f"{filename} bbox: {bbox}")
        cropped = img.crop(bbox)
        # resize to exact dimensions if it's off by 1 pixel
        if 'a4' in filename:
            cropped = cropped.resize((2480, 3507))
        else:
            cropped = cropped.resize((1748, 2480))
        cropped.save(out)
        print(f"Saved {out} with size {cropped.size}")
    else:
        print(f"{filename} is totally empty!")

crop_to_bbox('a4-1-new.svg.png', 'templates/a4-1.png')
crop_to_bbox('a5-1-new.svg.png', 'templates/a5-1.png')
