from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


SOURCE = Path("assets/products/cozy/wishing-lantern-charm.jpg")
OUTPUT = Path("assets/products/uniform/wishing-lantern-charm.jpg")
TARGET_BG = (255, 250, 247)


def main():
    image = Image.open(SOURCE).convert("RGB")
    image = ImageEnhance.Brightness(image).enhance(0.9)
    image = ImageEnhance.Contrast(image).enhance(0.86)
    image = ImageEnhance.Sharpness(image).enhance(1.2)

    width, height = image.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((418, 210, 590, 390), fill=255)
    draw.rounded_rectangle((458, 332, 552, 470), radius=34, fill=255)
    draw.ellipse((398, 405, 616, 660), fill=255)
    draw.rounded_rectangle((386, 530, 626, 770), radius=82, fill=255)
    draw.ellipse((405, 690, 612, 792), fill=255)
    draw.rectangle((430, 382, 585, 585), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2.2))

    canvas = Image.new("RGB", (width, height), TARGET_BG)
    result = Image.composite(image, canvas, mask)
    result.save(OUTPUT, quality=95, optimize=True)
    print(f"saved {OUTPUT}")


if __name__ == "__main__":
    main()
