from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "assets" / "products"
CANVAS = 1200
CENTER = (CANVAS // 2, 535)
OUTER = 335
INNER = 190

COLORS = {
    "aqua-star-crystal-charm.jpg": (19, 177, 196),
    "champagne-star-crystal-charm.jpg": (191, 139, 82),
    "emerald-star-crystal-charm.jpg": (38, 152, 92),
    "golden-star-crystal-charm.jpg": (218, 164, 36),
    "lemon-star-crystal-charm.jpg": (232, 211, 54),
    "orange-star-crystal-charm.jpg": (236, 129, 41),
    "pink-star-crystal-charm.jpg": (224, 91, 151),
    "purple-star-crystal-charm.jpg": (132, 80, 181),
    "ruby-red-star-crystal-charm.jpg": (184, 35, 47),
    "sapphire-star-crystal-charm.jpg": (36, 80, 174),
    "sky-blue-star-crystal-charm.jpg": (74, 157, 221),
    "smoky-brown-star-crystal-charm.jpg": (126, 93, 73),
}


def clamp(value: int) -> int:
    return max(0, min(255, value))


def tint(color: tuple[int, int, int], amount: int) -> tuple[int, int, int, int]:
    return tuple(clamp(channel + amount) for channel in color) + (236,)


def star_points() -> list[tuple[float, float]]:
    points = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = OUTER if index % 2 == 0 else INNER
        points.append((CENTER[0] + math.cos(angle) * radius, CENTER[1] + math.sin(angle) * radius))
    return points


def draw_star(path: Path, base: tuple[int, int, int]) -> None:
    random.seed(path.name)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))
    shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((365, 820, 835, 900), fill=(40, 32, 28, 34))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)

    points = star_points()
    star_layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(star_layer, "RGBA")

    center = CENTER
    facet_offsets = [45, -10, 28, -42, 12, 58, -24, 34, -6, 48]
    for index, point in enumerate(points):
        next_point = points[(index + 1) % len(points)]
        facet = [center, point, next_point]
        draw.polygon(facet, fill=tint(base, facet_offsets[index]))

    # Inner gem facets.
    inner_radius = 122
    inner_points = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = inner_radius if index % 2 == 0 else inner_radius * 0.62
        inner_points.append((center[0] + math.cos(angle) * radius, center[1] + math.sin(angle) * radius))
    draw.polygon(inner_points, fill=tint(base, 18))
    for index in range(0, 10, 2):
        draw.polygon([center, inner_points[index], inner_points[(index + 1) % 10]], fill=tint(base, 62))
        draw.polygon([center, inner_points[(index + 1) % 10], inner_points[(index + 2) % 10]], fill=tint(base, -28))

    # Highlights and crystal edges.
    draw.line(points + [points[0]], fill=(255, 255, 255, 118), width=8, joint="curve")
    for point in points:
        draw.line([center, point], fill=(255, 255, 255, 58), width=5)
    draw.polygon([(430, 430), (525, 390), (488, 496)], fill=(255, 255, 255, 138))
    draw.polygon([(730, 438), (792, 493), (700, 520)], fill=(255, 255, 255, 96))
    draw.polygon([(545, 675), (610, 735), (487, 710)], fill=(255, 255, 255, 72))

    outline = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    outline_draw = ImageDraw.Draw(outline, "RGBA")
    outline_draw.line(points + [points[0]], fill=tuple(clamp(channel - 42) for channel in base) + (142,), width=10, joint="curve")
    outline = outline.filter(ImageFilter.GaussianBlur(0.5))
    canvas.alpha_composite(outline)
    canvas.alpha_composite(star_layer)
    canvas.convert("RGB").save(path, "JPEG", quality=94, optimize=True)


for filename, color in COLORS.items():
    draw_star(OUT_DIR / filename, color)
