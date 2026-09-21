"""Compose Filter King now at Filter Hero on a transparent navy-safe plate."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERO_SRC = Path(r"E:\FILTER HEROE\Gemini_Generated_Image_yb2udeyb2udeyb2u.png")
KING_SRC = Path(
    r"C:\Users\lazar\.cursor\projects\c-Users-lazar-Downloads-Github-FILTER-HERO"
    r"\assets\c__Users_lazar_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"ad16a225044dfe5ba0ce41ca8cfb7c5c_images_LOGO-c6f8eeb4-9d74-4916-a8d0-035bc3a10df9.png"
)
OUTS = [
    Path(r"c:\Users\lazar\Downloads\Github\FILTER HERO\client\public\hero\fh-sells-fk.png"),
    Path(r"E:\FILTER HEROE\fh-sells-fk.png"),
]

ICE = (214, 232, 248, 255)
WHITE = (244, 247, 251, 255)


def knock_white(im: Image.Image, threshold: int = 232) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return im


def knock_light_keep_ink(im: Image.Image, threshold: int = 150) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (r + g + b) / 3 >= threshold:
                px[x, y] = (r, g, b, 0)
    return im


def hero_on_navy(im: Image.Image) -> Image.Image:
    """Keep Filter Hero red. Lift navy ink to ice so it reads on the hero wash."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if r > 90 and r > b + 15 and r >= g:
                continue
            luma = (r + g + b) / 3
            if luma < 200 and b >= r - 8:
                t = min(1.0, max(0.0, (90 - luma) / 90))
                px[x, y] = (
                    int(r + (ICE[0] - r) * (0.72 + 0.28 * t)),
                    int(g + (ICE[1] - g) * (0.72 + 0.28 * t)),
                    int(b + (ICE[2] - b) * (0.72 + 0.28 * t)),
                    a,
                )
    return im


def ink_to_ice(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            px[x, y] = (*ICE[:3], a)
    return im


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop(
        (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))
    )


def fit_height(im: Image.Image, height: int) -> Image.Image:
    w = max(1, round(im.width * (height / im.height)))
    return im.resize((w, height), Image.Resampling.LANCZOS)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        r"C:\Windows\Fonts\arialbi.ttf",
        r"C:\Windows\Fonts\ARIALBI.TTF",
        r"C:\Windows\Fonts\impact.ttf",
        r"C:\Windows\Fonts\seguibli.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_now_at(height: int) -> Image.Image:
    """Retail connector: Filter King now at Filter Hero. Not a maker claim."""
    font = load_font(max(22, int(height * 0.16)))
    lines = ("NOW", "AT")
    probe = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    draw = ImageDraw.Draw(probe)
    widths = []
    heights = []
    boxes = []
    for line in lines:
        box = draw.textbbox((0, 0), line, font=font)
        boxes.append(box)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])
    gap = 2
    w = max(widths) + 8
    h = sum(heights) + gap + 8
    ticket = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ticket)
    y = 4
    for line, box, tw, th in zip(lines, boxes, widths, heights, strict=True):
        d.text(((w - tw) / 2 - box[0], y - box[1]), line, font=font, fill=WHITE)
        y += th + gap
    return ticket


def main() -> None:
    hero = hero_on_navy(trim(knock_white(Image.open(HERO_SRC))))
    king = ink_to_ice(trim(knock_light_keep_ink(Image.open(KING_SRC))))

    mark_h = 220
    hero = fit_height(hero, mark_h)
    king = fit_height(king, int(mark_h * 0.58))
    word = draw_now_at(mark_h)

    gap = 28
    canvas_w = hero.width + word.width + king.width + gap * 2 + 24
    canvas_h = max(hero.height, word.height, king.height) + 16
    plate = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    x = 12
    plate.alpha_composite(king, (x, (canvas_h - king.height) // 2))
    x += king.width + gap
    plate.alpha_composite(word, (x, (canvas_h - word.height) // 2))
    x += word.width + gap
    plate.alpha_composite(hero, (x, (canvas_h - hero.height) // 2))

    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        plate.save(out, format="PNG", optimize=True)
        print(out, plate.size, out.stat().st_size)


if __name__ == "__main__":
    main()
