"""Create MERV-matched pack shots from the MERV 8 source photos.

Reads originals from client/public/products/source/. Shop files in
client/public/products/ are generated for ratings that still need stamps.
Never stamp a vertical MERV badge on pack-shot sides (FH-045).

Do not overwrite merv-8-packshot.png, merv-11-packshot.png, or
merv-13-packshot.png — those are the official heroes for every size and
pack quantity (FH-047, FH-049, FH-048).
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "client" / "public" / "products"
SOURCE = SRC / "source"

OFFICIAL_PACKSHOTS = frozenset({"8", "11", "13"})

VARIANTS = [
    {
        "key": "11",
        "title": "MERV 11",
        "sub": "ADVANCED",
        "layers": "MERV 11",
        "color": (210, 27, 34),
        "stamp_face": True,
        "layers_only": True,
    },
    {
        "key": "13",
        "title": "MERV 13",
        "sub": "ULTIMATE",
        "layers": "MERV 13",
        "color": (238, 158, 16),
        "stamp_face": True,
        "layers_only": True,
    },
    {
        "key": "carbon",
        "title": "MERV 8",
        "sub": "CARBON",
        "layers": "MERV 8 Carbon",
        "color": (17, 17, 17),
        "stamp_face": True,
        "layers_only": False,
    },
]


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path(r"C:\Windows\Fonts") / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def plate(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    color: tuple[int, int, int],
    title: str,
    sub: str,
    title_size: int,
    sub_size: int,
) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=max(8, (y1 - y0) // 8), fill=color)
    tf = font(title_size, True)
    sf = font(sub_size, True)
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    draw.text((cx, cy - sub_size), title, fill=(255, 255, 255), font=tf, anchor="mm")
    draw.text((cx, cy + title_size * 0.45), sub, fill=(255, 255, 255), font=sf, anchor="mm")


def paint_cardboard(im: Image.Image, box: tuple[int, int, int, int], fill: tuple[int, int, int]) -> None:
    """Cover printed MERV on a frame edge with cardboard. No rating badge."""
    ImageDraw.Draw(im).rectangle(box, fill=fill)


def relabel_6pack(src: Image.Image, spec: dict) -> Image.Image:
    im = src.copy()
    draw = ImageDraw.Draw(im)
    if spec["stamp_face"]:
        color = spec["color"]
        face = (412, 78, 694, 262)
        draw.rectangle(face, fill=color)
        plate(draw, face, color, spec["title"], spec["sub"], 36, 14)
    cardboard = (248, 247, 247)
    paint_cardboard(im, (193, 505, 257, 775), cardboard)
    paint_cardboard(im, (283, 665, 304, 775), cardboard)
    return im


def relabel_three_quarter(src: Image.Image) -> Image.Image:
    im = src.copy()
    paint_cardboard(im, (242, 820, 275, 950), (245, 245, 245))
    return im


def relabel_layers(src: Image.Image, spec: dict) -> Image.Image:
    if not spec["layers"]:
        return src.copy()
    im = src.copy()
    draw = ImageDraw.Draw(im)
    draw.rectangle((275, 60, 530, 126), fill=(242, 242, 242))
    label = f"Filter media ({spec['layers']})"
    draw.text(
        (402, 86),
        label,
        fill=(32, 56, 104),
        font=font(16, True),
        anchor="mm",
    )
    return im


def assert_no_side_badge(im: Image.Image, color: tuple[int, int, int], name: str) -> None:
    """The old vertical-plate region must not be a solid MERV badge."""
    px = im.load()
    hits = 0
    for y in range(455, 745, 4):
        for x in range(196, 340, 4):
            r, g, b = px[x, y]
            if abs(r - color[0]) < 18 and abs(g - color[1]) < 18 and abs(b - color[2]) < 18:
                hits += 1
    if hits > 80:
        raise SystemExit(f"{name}: side MERV badge still present ({hits} matching pixels)")


def ensure_sources() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for name in (
        "merv-8-thin-rectangle-6pack.png",
        "merv-8-thin-rectangle-no-labels.png",
        "merv-8-layers.png",
    ):
        dest = SOURCE / name
        shop = SRC / name
        if dest.exists():
            continue
        if not shop.exists():
            raise SystemExit(f"missing source photo {shop}")
        shutil.copy(shop, dest)


def main() -> None:
    ensure_sources()
    for key in sorted(OFFICIAL_PACKSHOTS):
        official = SRC / f"merv-{key}-packshot.png"
        if not official.exists():
            raise SystemExit(f"missing official pack shot {official}")
    pack = Image.open(SOURCE / "merv-8-thin-rectangle-6pack.png").convert("RGB")
    three = Image.open(SOURCE / "merv-8-thin-rectangle-no-labels.png").convert("RGB")
    layers = Image.open(SOURCE / "merv-8-layers.png").convert("RGB")

    written: list[str] = []
    for spec in VARIANTS:
        key = spec["key"]
        out_layers = SRC / f"merv-{key}-layers.png"
        relabel_layers(layers, spec).save(out_layers, optimize=True)
        written.append(out_layers.name)
        if spec.get("layers_only") or key in OFFICIAL_PACKSHOTS:
            continue
        out_pack = SRC / f"merv-{key}-thin-rectangle-6pack.png"
        out_three = SRC / f"merv-{key}-thin-rectangle-no-labels.png"
        pack_im = relabel_6pack(pack, spec)
        three_im = relabel_three_quarter(three)
        if spec["stamp_face"]:
            assert_no_side_badge(pack_im, spec["color"], out_pack.name)
        pack_im.save(out_pack, optimize=True)
        three_im.save(out_three, optimize=True)
        written.extend([out_pack.name, out_three.name])

    print("wrote", ", ".join(written))


if __name__ == "__main__":
    main()
