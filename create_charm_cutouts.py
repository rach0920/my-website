from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


ROOT = Path("assets/products/uniform")
OUT = Path("assets/products/cutouts")
OUT.mkdir(parents=True, exist_ok=True)

SKIP = {
    "heart-stars-charm-chain-necklace.jpg",
}


def corner_background(rgb):
    width, height = rgb.size
    sample = 70
    boxes = [
        (0, 0, sample, sample),
        (width - sample, 0, width, sample),
        (0, height - sample, sample, height),
        (width - sample, height - sample, width, height),
    ]
    colors = []
    for box in boxes:
        stat = ImageStat.Stat(rgb.crop(box))
        colors.append(tuple(int(v) for v in stat.median))
    return tuple(sorted(channel)[len(channel) // 2] for channel in zip(*colors))


def color_distance(pixel, bg):
    return sum((int(pixel[i]) - int(bg[i])) ** 2 for i in range(3)) ** 0.5


def flood_background(rgb, threshold=68):
    width, height = rgb.size
    pixels = rgb.load()
    bg = corner_background(rgb)
    visited = bytearray(width * height)
    background = bytearray(width * height)
    queue = deque()

    def push(x, y):
      idx = y * width + x
      if visited[idx]:
          return
      visited[idx] = 1
      if color_distance(pixels[x, y], bg) <= threshold:
          background[idx] = 1
          queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                push(nx, ny)

    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if background[row + x]:
                alpha_pixels[x, y] = 0
    return alpha.filter(ImageFilter.GaussianBlur(0.8))


def save_cutout(path):
    image = Image.open(path).convert("RGB")
    alpha = flood_background(image)
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.point(lambda value: 255 if value > 18 else 0).getbbox()
    if not bbox:
        return False
    pad = 18
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(rgba.width, bbox[2] + pad)
    bottom = min(rgba.height, bbox[3] + pad)
    cut = rgba.crop((left, top, right, bottom))
    cut.thumbnail((560, 560), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (620, 620), (255, 255, 255, 0))
    x = (canvas.width - cut.width) // 2
    y = (canvas.height - cut.height) // 2
    canvas.alpha_composite(cut, (x, y))
    canvas.save(OUT / f"{path.stem}.png", optimize=True)
    return True


def main():
    created = 0
    for path in sorted(ROOT.glob("*.jpg")):
        if path.name in SKIP:
            continue
        if "charm" not in path.stem:
            continue
        if save_cutout(path):
            created += 1
    print(f"created {created} transparent charm cutouts in {OUT}")


if __name__ == "__main__":
    main()
