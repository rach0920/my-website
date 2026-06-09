from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


SOURCE_DIR = Path("assets/products/cozy")
OUTPUT_DIR = Path("assets/products/uniform")
TARGET_BG = (255, 250, 247)


def corner_average(image):
    width, height = image.size
    size = max(16, min(width, height) // 10)
    regions = [
        image.crop((0, 0, size, size)),
        image.crop((width - size, 0, width, size)),
        image.crop((0, height - size, size, height)),
        image.crop((width - size, height - size, width, height)),
    ]
    pixels = []
    for region in regions:
        flattened_data = getattr(region, "get_flattened_data", None)
        pixels.extend(flattened_data() if flattened_data else region.getdata())
    return tuple(round(sum(channel) / len(pixels)) for channel in zip(*pixels))


def normalize_image(source, output):
    image = Image.open(source).convert("RGB")
    bg = corner_average(image)
    pixels = image.load()
    mask = Image.new("L", image.size, 0)
    mask_pixels = mask.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b = pixels[x, y]
            distance = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            light_background = min(r, g, b) > 178 and max(r, g, b) - min(r, g, b) < 52
            near_corner_background = distance < 86 and min(r, g, b) > 150
            if light_background or near_corner_background:
                mask_pixels[x, y] = 255

    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    solid = Image.new("RGB", image.size, TARGET_BG)
    normalized = Image.composite(solid, image, mask)

    output.parent.mkdir(parents=True, exist_ok=True)
    normalized.save(output, "JPEG", quality=94, optimize=True)


def main():
    count = 0
    for source in sorted(SOURCE_DIR.glob("*.jpg")):
        normalize_image(source, OUTPUT_DIR / source.name)
        count += 1
    print(f"normalized {count} images into {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
