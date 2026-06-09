import json
import re
import time
import urllib.request
from pathlib import Path


SOURCE_JSON = Path("assets/cozy-products.json")
OUTPUT_JS = Path("products-data.js")
IMAGE_DIR = Path("assets/products/cozy")
UNIFORM_IMAGE_DIR = Path("assets/products/uniform")


def slugify(text):
    text = re.sub(r"[^\w\s-]", "", text.lower(), flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", text).strip("-") or "product"


def download_image(url, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and output.stat().st_size > 0:
        return
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        output.write_bytes(response.read())
    time.sleep(0.08)


def product_category(product_type):
    value = (product_type or "Charms").strip()
    if value.lower() in {"beads", "chains", "sets", "charms"}:
        return value[:1].upper() + value[1:].lower()
    return "Charms"


def main():
    data = json.loads(SOURCE_JSON.read_text(encoding="utf-8-sig"))
    products = [edge["node"] for edge in data["data"]["products"]["edges"]]
    output = []

    for index, product in enumerate(products, start=1):
        handle = product["handle"]
        images = [edge["node"] for edge in product.get("images", {}).get("edges", [])]
        variants = [edge["node"] for edge in product.get("variants", {}).get("edges", [])]
        first_variant = variants[0] if variants else {}
        min_price = product["priceRange"]["minVariantPrice"]
        category = product_category(product.get("productType"))

        image_url = images[0]["url"] if images else ""
        image_path = IMAGE_DIR / f"{handle}.jpg"
        if image_url:
            download_image(image_url, image_path)
        original_image = image_url
        display_image = UNIFORM_IMAGE_DIR / image_path.name
        if not display_image.exists():
            display_image = image_path

        output.append({
            "id": handle,
            "shopifyId": product["id"],
            "title": product["title"],
            "category": category,
            "price": float(min_price["amount"]),
            "currency": min_price["currencyCode"],
            "image": str(display_image).replace("\\", "/"),
            "originalImage": original_image,
            "tag": category.lower(),
            "stock": 10 if first_variant.get("availableForSale", True) else 0,
            "rating": 4.9,
            "personalized": False,
            "created": index,
            "description": product.get("description") or product["title"],
            "handle": handle,
            "options": product.get("options", []),
            "variants": {
                "id": first_variant.get("id", f"{handle}-variant"),
                "title": first_variant.get("title", "Default Title"),
                "price": first_variant.get("price", min_price),
                "availableForSale": first_variant.get("availableForSale", True),
                "selectedOptions": first_variant.get("selectedOptions", [{"name": "Title", "value": "Default Title"}]),
            },
        })

    OUTPUT_JS.write_text(
        "window.AMETOPIA_PRODUCTS = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "products": len(output),
        "starCrystalProducts": sum(p["handle"].endswith("-star-crystal-charm") for p in output),
        "downloadedDir": str(IMAGE_DIR),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
