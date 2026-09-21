import os

from PIL import Image

SRC = r"E:\FILTER HEROE\RESET.png"
OUT_DIR = r"c:\Users\lazar\Downloads\Github\FILTER HERO\client\public"


def main():
    src = Image.open(SRC).convert("RGB")
    os.makedirs(OUT_DIR, exist_ok=True)

    desktop = src
    if desktop.width > 2400:
        ratio = 2400 / desktop.width
        desktop = desktop.resize(
            (2400, int(desktop.height * ratio)), Image.Resampling.LANCZOS
        )
    webp_path = os.path.join(OUT_DIR, "hero-banner.webp")
    desktop.save(webp_path, "WEBP", quality=92, method=6)

    # Live Shop Now overlay — same pixels as the painted CTA
    shop = src.crop((1678, 754, 2008, 842))
    shop_path = os.path.join(OUT_DIR, "hero-shop-now.webp")
    shop.save(shop_path, "WEBP", quality=95, method=6)

    mobile = src.crop(
        (
            0,
            0,
            int(src.width * 0.50),
            src.height,
        )
    )
    if mobile.width > 1200:
        ratio = 1200 / mobile.width
        mobile = mobile.resize(
            (1200, int(mobile.height * ratio)), Image.Resampling.LANCZOS
        )
    mobile_path = os.path.join(OUT_DIR, "hero-banner-mobile.webp")
    mobile.save(mobile_path, "WEBP", quality=92, method=6)

    print("src", src.size)
    print("desktop", desktop.size, os.path.getsize(webp_path))
    print("shop", shop.size, os.path.getsize(shop_path))
    print("mobile", mobile.size, os.path.getsize(mobile_path))


if __name__ == "__main__":
    main()
