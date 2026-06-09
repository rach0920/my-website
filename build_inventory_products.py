import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, ImageStat


WORKBOOK = Path("E:/R&K Business/\u5165\u5e93\u4ea7\u54c1\u6e05\u5355.xlsx")
PRODUCT_DIR = Path("assets/products/inventory")
RAW_DIR = Path("assets/products/inventory-raw")
PREVIEW_DIR = Path("assets")
CANVAS_SIZE = 1200
SKIP_PRODUCT_NUMBERS = {7, 51, 52, 53, 54, 55, 56}


NS_SHEET = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_DRAWING = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
NS_RELS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}


def slugify(text):
    text = re.sub(r"[^\w\s-]", "", text.lower(), flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text or "product"


def cell_value(cell):
    if cell.get("t") == "inlineStr":
        return "".join(t.text or "" for t in cell.findall(".//m:t", NS_SHEET)).strip()
    value = cell.find("m:v", NS_SHEET)
    return (value.text or "").strip() if value is not None else ""


def load_sheet_rows(zf):
    root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
    rows = {}
    for row in root.findall(".//m:sheetData/m:row", NS_SHEET):
        row_num = int(row.get("r"))
        values = {}
        for cell in row.findall("m:c", NS_SHEET):
            col = re.match(r"([A-Z]+)", cell.get("r")).group(1)
            values[col] = cell_value(cell)
        rows[row_num] = values
    return rows


def load_image_map(zf):
    rel_root = ET.fromstring(zf.read("xl/drawings/_rels/drawing1.xml.rels"))
    rels = {
        rel.get("Id"): rel.get("Target").lstrip("/")
        for rel in rel_root.findall("rel:Relationship", NS_RELS)
    }

    drawing = ET.fromstring(zf.read("xl/drawings/drawing1.xml"))
    images = []
    for index, anchor in enumerate(drawing.findall("xdr:oneCellAnchor", NS_DRAWING), start=1):
        row = int(anchor.find("xdr:from/xdr:row", NS_DRAWING).text) + 1
        col = int(anchor.find("xdr:from/xdr:col", NS_DRAWING).text) + 1
        blip = anchor.find(".//a:blip", NS_DRAWING)
        rel_id = blip.get(f"{{{NS_DRAWING['r']}}}embed")
        images.append({
            "productNumber": index,
            "row": row,
            "col": col,
            "path": rels[rel_id],
        })
    return images


def estimate_background(image):
    width, height = image.size
    sample_size = max(16, min(width, height) // 18)
    samples = []
    for box in (
        (0, 0, sample_size, sample_size),
        (width - sample_size, 0, width, sample_size),
        (0, height - sample_size, sample_size, height),
        (width - sample_size, height - sample_size, width, height),
    ):
        stat = ImageStat.Stat(image.crop(box).convert("RGB"))
        samples.append(tuple(int(value) for value in stat.median))
    return tuple(sorted(channel)[len(channel) // 2] for channel in zip(*samples))


def build_mask(image, bg, saturation_only=False):
    image = image.convert("RGB")
    hsv = image.convert("HSV")
    saturation = hsv.getchannel("S")
    if saturation_only:
        mask = saturation.point(lambda value: 255 if value > 78 else 0)
    else:
        diff = ImageChops.difference(image, Image.new("RGB", image.size, bg)).convert("L")
        mask = diff.point(lambda value: 255 if value > 22 else 0)
        color_mask = saturation.point(lambda value: 255 if value > 30 else 0)
        mask = ImageChops.lighter(mask, color_mask)
    mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5))
    return keep_product_components(mask, image.convert("HSV"))


def keep_product_components(mask, hsv_image):
    binary = mask.point(lambda value: 255 if value else 0)
    width, height = binary.size
    pixels = binary.load()
    sat_pixels = hsv_image.getchannel("S").load()
    val_pixels = hsv_image.getchannel("V").load()
    visited = bytearray(width * height)
    components = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if visited[idx] or pixels[x, y] == 0:
                continue
            stack = [(x, y)]
            visited[idx] = 1
            points = []
            while stack:
                cx, cy = stack.pop()
                points.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if visited[nidx] or pixels[nx, ny] == 0:
                        continue
                    visited[nidx] = 1
                    stack.append((nx, ny))
            if len(points) < max(80, width * height * 0.00008):
                continue
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            avg_sat = sum(sat_pixels[px, py] for px, py in points) / len(points)
            avg_val = sum(val_pixels[px, py] for px, py in points) / len(points)
            components.append({
                "points": points,
                "area": len(points),
                "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
                "cx": sum(xs) / len(xs),
                "cy": sum(ys) / len(ys),
                "avg_sat": avg_sat,
                "avg_val": avg_val,
            })

    if not components:
        return binary

    biggest = max(components, key=lambda c: c["area"])
    center_x = width / 2
    center_y = height * 0.42
    keep = Image.new("L", (width, height), 0)
    keep_pixels = keep.load()

    for component in components:
        left, top, right, bottom = component["bbox"]
        vertical_text_zone = top > height * 0.72
        tiny_far_label = component["area"] < biggest["area"] * 0.18 and abs(component["cx"] - center_x) > width * 0.23
        too_far_from_product = (
            component["area"] < biggest["area"] * 0.12
            and abs(component["cy"] - center_y) > height * 0.34
        )
        low_sat_annotation = (
            component["avg_sat"] < 28
            and component["avg_val"] < 210
            and component["area"] < biggest["area"] * 0.55
        )
        thin_annotation = (
            component["area"] < biggest["area"] * 0.35
            and ((right - left) > (bottom - top) * 5 or (bottom - top) > (right - left) * 5)
        )
        if vertical_text_zone or tiny_far_label or too_far_from_product or low_sat_annotation or thin_annotation:
            continue
        for px, py in component["points"]:
            keep_pixels[px, py] = 255

    return keep.filter(ImageFilter.MaxFilter(3))


def clean_product_image(source_bytes, output_path, saturation_only=False):
    image = Image.open(source_bytes).convert("RGB")
    image = ImageOps.exif_transpose(image)
    bg = estimate_background(image)
    mask = build_mask(image, bg, saturation_only=saturation_only)
    bbox = mask.getbbox()
    if not bbox:
        image.thumbnail((CANVAS_SIZE - 260, CANVAS_SIZE - 260), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), "white")
        canvas.paste(image, ((CANVAS_SIZE - image.width) // 2, (CANVAS_SIZE - image.height) // 2))
        canvas.save(output_path, quality=94, subsampling=0)
        return

    pad = max(18, int(min(image.size) * 0.04))
    left = max(bbox[0] - pad, 0)
    top = max(bbox[1] - pad, 0)
    right = min(bbox[2] + pad, image.width)
    bottom = min(bbox[3] + pad, image.height)

    product = image.crop((left, top, right, bottom))
    alpha = mask.crop((left, top, right, bottom)).filter(ImageFilter.GaussianBlur(0.8))

    target = CANVAS_SIZE - 270
    scale = min(target / product.width, target / product.height)
    new_size = (max(1, int(product.width * scale)), max(1, int(product.height * scale)))
    product = product.resize(new_size, Image.Resampling.LANCZOS)
    alpha = alpha.resize(new_size, Image.Resampling.LANCZOS)
    if saturation_only:
        hsv_product = product.convert("HSV")
        sat = hsv_product.getchannel("S").load()
        val = hsv_product.getchannel("V").load()
        alpha_pixels = alpha.load()
        for py in range(product.height):
            for px in range(product.width):
                if sat[px, py] < 74:
                    alpha_pixels[px, py] = 0

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), "white")
    shadow = Image.new("RGBA", new_size, (0, 0, 0, 0))
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(26)).point(lambda value: int(value * 0.18)))

    x = (CANVAS_SIZE - new_size[0]) // 2
    y = (CANVAS_SIZE - new_size[1]) // 2 - 10
    canvas.alpha_composite(shadow, (x + 20, y + 32))
    canvas.alpha_composite(Image.merge("RGBA", (*product.split(), alpha)), (x, y))
    final = canvas.convert("RGB")
    if saturation_only:
        hsv_final = final.convert("HSV")
        sat = hsv_final.getchannel("S").load()
        val = hsv_final.getchannel("V").load()
        pixels = final.load()
        for py in range(final.height):
            for px in range(final.width):
                if val[px, py] < 105 and sat[px, py] < 90:
                    pixels[px, py] = (255, 255, 255)
    final.save(output_path, quality=94, subsampling=0)


def category_for(text):
    if "\u94fe" in text or "necklace" in text.lower():
        return "Chains" if "\u624b\u94fe" in text else "Chains"
    if "\u5b57\u6bcd" in text or "\u540a\u5760" in text or "\u5341\u5b57\u67b6" in text:
        return "Charms"
    return "Charms"


def price_for(category, title):
    if category == "Chains":
        return 29.99 if "\u624b\u94fe" in title else 34.99
    if "\u5b57\u6bcd" in title:
        return 12.99
    return 14.99


def stock_from(values):
    note = values.get("G", "")
    qty = values.get("E", "")
    match = re.search(r"\u5165\u5e93\\s*(\\d+)", note)
    if match:
        return int(match.group(1))
    if str(qty).isdigit():
        return int(qty)
    return 5


def make_preview(image_paths):
    cols = 5
    cell_w, cell_h = 220, 260
    rows = (len(image_paths) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "white")
    draw = ImageDraw.Draw(sheet)
    for index, (path, label) in enumerate(image_paths):
        image = Image.open(path).convert("RGB")
        image.thumbnail((190, 190), Image.Resampling.LANCZOS)
        x = (index % cols) * cell_w + 15
        y = (index // cols) * cell_h + 10
        sheet.paste(image, (x + (190 - image.width) // 2, y))
        draw.text((x, y + 198), label[:24], fill=(0, 0, 0))
    sheet.save(PREVIEW_DIR / "inventory-products-contact.jpg", quality=90)


def main():
    PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(WORKBOOK) as zf:
        rows = load_sheet_rows(zf)
        images = load_image_map(zf)

        products = []
        preview = []
        used_slugs = {}
        for image_info in images:
            product_number = image_info["productNumber"]
            if product_number in SKIP_PRODUCT_NUMBERS:
                continue
            values = rows.get(image_info["row"], {})
            title_cn = values.get("D") or values.get("C") or f"Product {product_number}"
            code = values.get("C", "")
            slug_base = slugify(f"{product_number}-{title_cn}")
            slug_count = used_slugs.get(slug_base, 0)
            used_slugs[slug_base] = slug_count + 1
            slug = slug_base if slug_count == 0 else f"{slug_base}-{slug_count + 1}"

            raw_ext = Path(image_info["path"]).suffix.lower() or ".png"
            raw_path = RAW_DIR / f"{slug}{raw_ext}"
            raw_path.write_bytes(zf.read(image_info["path"]))

            output_path = PRODUCT_DIR / f"{slug}.jpg"
            saturation_only = "\u5b57\u6bcd" in title_cn or product_number in {15, 16, 47}
            with raw_path.open("rb") as source:
                clean_product_image(source, output_path, saturation_only=saturation_only)

            category = category_for(title_cn)
            stock = stock_from(values)
            title = title_cn
            description = f"{title_cn}. Product code: {code}. Stock received: {stock}."
            product = {
                "id": slug,
                "shopifyId": f"ametopia-inventory-{product_number}",
                "title": title,
                "category": category,
                "price": price_for(category, title_cn),
                "currency": "AUD",
                "image": str(output_path).replace("\\", "/"),
                "originalImage": str(raw_path).replace("\\", "/"),
                "tag": category.lower(),
                "stock": stock,
                "rating": 4.9,
                "personalized": False,
                "created": product_number,
                "description": description,
                "handle": slug,
                "options": [{"name": "Title", "values": ["Default Title"]}],
                "variants": {
                    "id": f"ametopia-inventory-variant-{product_number}",
                    "title": "Default Title",
                    "price": {"amount": f"{price_for(category, title_cn):.2f}", "currencyCode": "AUD"},
                    "availableForSale": stock > 0,
                    "selectedOptions": [{"name": "Title", "value": "Default Title"}],
                },
            }
            products.append(product)
            preview.append((output_path, f"{product_number} {title_cn}"))

    Path("products-data.js").write_text(
        "window.AMETOPIA_PRODUCTS = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    make_preview(preview)
    print(json.dumps({"products": len(products), "preview": str(PREVIEW_DIR / "inventory-products-contact.jpg")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
