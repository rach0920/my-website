from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


ROOT = Path("assets/products/uniform")
OUT = Path("assets/products/base-cutouts")
OUT.mkdir(parents=True, exist_ok=True)

BASE_NAMES = {
    "gold-bead-ball-chain-bracelet.jpg",
    "red-rope-gold-chain-bracelet.jpg",
    "gold-curb-chain-carabiner-necklace.jpg",
    "gold-snake-chain-ring-clasp-necklace.jpg",
    "golden-key-heart-charm.jpg",
}


def corner_background(rgb):
    width, height = rgb.size
    sample = 80
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


def distance(pixel, bg):
    return sum((int(pixel[i]) - int(bg[i])) ** 2 for i in range(3)) ** 0.5


def make_alpha(rgb, threshold=58):
    width, height = rgb.size
    bg = corner_background(rgb)
    pixels = rgb.load()
    alpha = Image.new("L", (width, height), 0)
    alpha_pixels = alpha.load()
    for y in range(height):
        for x in range(width):
            dist = distance(pixels[x, y], bg)
            if dist > threshold:
                alpha_pixels[x, y] = 255
            elif dist > threshold * 0.58:
                alpha_pixels[x, y] = int((dist - threshold * 0.58) / (threshold * 0.42) * 255)
    return alpha.filter(ImageFilter.GaussianBlur(0.55))


def save_cutout(path):
    image = Image.open(path).convert("RGB")
    alpha = make_alpha(image)
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.point(lambda value: 255 if value > 14 else 0).getbbox()
    if not bbox:
        return False
    pad = 26
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(rgba.width, bbox[2] + pad)
    bottom = min(rgba.height, bbox[3] + pad)
    cut = rgba.crop((left, top, right, bottom))
    cut.thumbnail((900, 560), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1000, 640), (255, 255, 255, 0))
    x = (canvas.width - cut.width) // 2
    y = (canvas.height - cut.height) // 2
    canvas.alpha_composite(cut, (x, y))
    canvas.save(OUT / f"{path.stem}.png", optimize=True)
    return True


def main():
    created = 0
    for name in sorted(BASE_NAMES):
        path = ROOT / name
        if path.exists() and save_cutout(path):
            created += 1
    print(f"created {created} base cutouts in {OUT}")


if __name__ == "__main__":
    main()
