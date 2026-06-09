from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat


SOURCE_DIR = Path("E:/R&K Business/12\u661f\u5ea7")
OUTPUT_DIR = Path("assets/products")
CANVAS_SIZE = 1200
TARGET_HEIGHT = 650

SOURCE_TO_PRODUCT = {
    "1.jpg": "ruby-red-star-crystal-charm.jpg",
    "10.jpg": "pink-star-crystal-charm.jpg",
    "11.jpg": "golden-star-crystal-charm.jpg",
    "12.jpg": "aqua-star-crystal-charm.jpg",
    "2.jpg": "purple-star-crystal-charm.jpg",
    "3.jpg": "sky-blue-star-crystal-charm.jpg",
    "4.jpg": "champagne-star-crystal-charm.jpg",
    "5.jpg": "emerald-star-crystal-charm.jpg",
    "6.jpg": "lemon-star-crystal-charm.jpg",
    "7.jpg": "orange-star-crystal-charm.jpg",
    "8.jpg": "smoky-brown-star-crystal-charm.jpg",
    "9.jpg": "sapphire-star-crystal-charm.jpg",
}


def estimate_background(image):
    samples = []
    width, height = image.size
    for box in (
        (0, 0, 80, 80),
        (width - 80, 0, width, 80),
        (0, height - 80, 80, height),
        (width - 80, height - 80, width, height),
    ):
        stat = ImageStat.Stat(image.crop(box))
        samples.append(tuple(int(value) for value in stat.median))
    return tuple(sorted(channel)[len(channel) // 2] for channel in zip(*samples))


def product_mask(roi, bg):
    bg_image = Image.new("RGB", roi.size, bg)
    diff = ImageChops.difference(roi, bg_image).convert("L")
    mask = diff.point(lambda value: 255 if value > 18 else 0)

    hsv = roi.convert("HSV")
    saturation = hsv.getchannel("S").point(lambda value: 255 if value > 34 else 0)
    mask = ImageChops.lighter(mask, saturation)

    mask = mask.filter(ImageFilter.MaxFilter(9))
    mask = mask.filter(ImageFilter.MinFilter(5))
    return remove_small_components(mask)


def remove_small_components(mask, min_area=2600):
    binary = mask.point(lambda value: 255 if value else 0)
    width, height = binary.size
    pixels = binary.load()
    visited = bytearray(width * height)
    keep = Image.new("L", (width, height), 0)
    keep_pixels = keep.load()

    for y in range(height):
        row = y * width
        for x in range(width):
            idx = row + x
            if visited[idx] or pixels[x, y] == 0:
                continue

            stack = [(x, y)]
            component = []
            visited[idx] = 1

            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if visited[nidx] or pixels[nx, ny] == 0:
                        continue
                    visited[nidx] = 1
                    stack.append((nx, ny))

            if len(component) >= min_area:
                for px, py in component:
                    keep_pixels[px, py] = 255

    return keep


def process_one(source, output):
    image = Image.open(source).convert("RGB")
    width, height = image.size
    bg = estimate_background(image)

    roi_box = (
        int(width * 0.4),
        int(height * 0.16),
        int(width * 0.82),
        int(height * 0.74),
    )
    roi = image.crop(roi_box)
    mask = product_mask(roi, bg)
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError(f"No product detected in {source}")

    pad = 34
    left = max(bbox[0] - pad, 0)
    top = max(bbox[1] - pad, 0)
    right = min(bbox[2] + pad, roi.width)
    bottom = min(bbox[3] + pad, roi.height)
    product = roi.crop((left, top, right, bottom))
    alpha = mask.crop((left, top, right, bottom)).filter(ImageFilter.GaussianBlur(1.2))

    scale = TARGET_HEIGHT / product.height
    resized_size = (int(product.width * scale), TARGET_HEIGHT)
    product = product.resize(resized_size, Image.Resampling.LANCZOS)
    alpha = alpha.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), "white")
    shadow = Image.new("RGBA", resized_size, (0, 0, 0, 0))
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(28)).point(lambda value: int(value * 0.2)))

    x = (CANVAS_SIZE - resized_size[0]) // 2
    y = 210
    canvas.alpha_composite(shadow, (x + 22, y + 36))
    canvas.alpha_composite(Image.merge("RGBA", (*product.split(), alpha)), (x, y))

    canvas = ImageOps.exif_transpose(canvas).convert("RGB")
    canvas.save(output, quality=94, subsampling=0)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in SOURCE_TO_PRODUCT.items():
        process_one(SOURCE_DIR / source_name, OUTPUT_DIR / output_name)


if __name__ == "__main__":
    main()
