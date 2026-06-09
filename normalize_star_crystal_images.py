from pathlib import Path

from collections import deque

from PIL import Image, ImageDraw, ImageFilter


SOURCE_DIR = Path("assets/products/cozy")
OUTPUT_DIR = Path("assets/products/uniform")
TARGET_BG = (255, 250, 247)
CANVAS_SIZE = 1000
TARGET_OBJECT_SIZE = 500

STAR_HANDLES = [
    "orange-star-crystal-charm",
    "aqua-star-crystal-charm",
    "purple-star-crystal-charm",
    "pink-star-crystal-charm",
    "smoky-brown-star-crystal-charm",
    "champagne-star-crystal-charm",
    "ruby-red-star-crystal-charm",
    "lemon-star-crystal-charm",
    "emerald-star-crystal-charm",
    "sky-blue-star-crystal-charm",
    "sapphire-star-crystal-charm",
    "golden-star-crystal-charm",
]


def corner_average(image):
    width, height = image.size
    size = max(18, min(width, height) // 12)
    boxes = [
        (0, 0, size, size),
        (width - size, 0, width, size),
        (0, height - size, size, height),
        (width - size, height - size, width, height),
    ]
    pixels = []
    for box in boxes:
        region = image.crop(box)
        flattened_data = getattr(region, "get_flattened_data", None)
        pixels.extend(flattened_data() if flattened_data else region.getdata())
    return tuple(round(sum(channel) / len(pixels)) for channel in zip(*pixels))


def object_mask(image, bg):
    width, height = image.size
    pixels = image.load()
    seed = bytearray(width * height)

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            saturation = max(r, g, b) - min(r, g, b)
            brightness = (r + g + b) / 3
            distance = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            is_crystal_colour = saturation > 42
            is_dark_facet = brightness < 165 and saturation > 22
            is_tinted_facet = distance > 95 and saturation > 18
            if (is_crystal_colour or is_dark_facet or is_tinted_facet) and not (brightness > 246 and saturation < 26):
                seed[y * width + x] = 1

    visited = bytearray(width * height)
    best_component = []

    def neighbours(x, y):
        for next_y in range(max(0, y - 1), min(height, y + 2)):
            for next_x in range(max(0, x - 1), min(width, x + 2)):
                if next_x != x or next_y != y:
                    yield next_x, next_y

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if not seed[start_index] or visited[start_index]:
                continue
            queue = deque([(start_x, start_y)])
            visited[start_index] = 1
            component = [start_index]
            while queue:
                x, y = queue.popleft()
                for next_x, next_y in neighbours(x, y):
                    index = next_y * width + next_x
                    if seed[index] and not visited[index]:
                        visited[index] = 1
                        component.append(index)
                        queue.append((next_x, next_y))
            if len(component) > len(best_component):
                best_component = component

    mask = Image.new("L", image.size, 0)
    mask_pixels = mask.load()
    for index in best_component:
        y, x = divmod(index, width)
        mask_pixels[x, y] = 255

    mask = mask.filter(ImageFilter.MaxFilter(19))
    mask = mask.filter(ImageFilter.MinFilter(11))
    return mask.filter(ImageFilter.GaussianBlur(0.8))


def padded_bbox(mask, padding=22):
    bbox = mask.point(lambda value: 255 if value > 42 else 0).getbbox()
    if not bbox:
        return (0, 0, mask.width, mask.height)
    left, top, right, bottom = bbox
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(mask.width, right + padding),
        min(mask.height, bottom + padding),
    )


def normalize_star(source, output):
    original = Image.open(source).convert("RGB")
    bg = corner_average(original)
    mask = object_mask(original, bg)
    bbox = padded_bbox(mask)

    product = original.crop(bbox).convert("RGBA")
    alpha = mask.crop(bbox)
    product.putalpha(alpha)

    scale = TARGET_OBJECT_SIZE / max(product.size)
    resized_size = (
        max(1, round(product.width * scale)),
        max(1, round(product.height * scale)),
    )
    product = product.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), TARGET_BG)
    top_left = ((CANVAS_SIZE - product.width) // 2, 505 - product.height // 2)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    shadow_width = int(product.width * 0.54)
    shadow_height = int(product.height * 0.095)
    shadow_left = (CANVAS_SIZE - shadow_width) // 2
    shadow_top = top_left[1] + product.height - int(product.height * 0.13)
    draw.ellipse(
        (
            shadow_left,
            shadow_top,
            shadow_left + shadow_width,
            shadow_top + shadow_height,
        ),
        fill=(96, 68, 58, 54),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(17))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    canvas.alpha_composite(product, top_left)

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output, "JPEG", quality=95, optimize=True)


def main():
    for handle in STAR_HANDLES:
        normalize_star(SOURCE_DIR / f"{handle}.jpg", OUTPUT_DIR / f"{handle}.jpg")
    print(f"normalized {len(STAR_HANDLES)} star crystal images")


if __name__ == "__main__":
    main()
