"""Pad Seedance flight onto 4K navy and finish on the Filter Hero logo pose."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
SRC = ROOT / "tmp" / "filter-hero-fly-entertaining.mp4"
LOGO = ROOT / "client" / "public" / "logo.png"
OUT = ROOT / "tmp" / "hero-fly-logo-end"
FRAMES = OUT / "frames"
RAW_FRAMES = OUT / "src-frames"
W, H, FPS = 3840, 2160, 24
# Seedance plate navy (sampled from source corners). Canvas must match
# this gradient in the plate band or the inset reads as a rectangle.
SEED_TOP = (26, 46, 78)
SEED_MID = (33, 52, 88)
SEED_BOT = (47, 68, 110)
# Source plate occupies this fraction of the 4K frame so he stays on-screen.
PLATE = 0.52
HOLD = 1.35
FADE = 0.85


def knockout(src: Image.Image) -> Image.Image:
    im = src.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 236 and g > 236 and b > 236:
                px[x, y] = (0, 0, 0, 0)
    return im


def logo_cutout() -> Image.Image:
    im = knockout(Image.open(LOGO))
    w, h = im.size
    # Drop the wordmark: keep the flying figure in the upper band.
    crop = im.crop((0, 0, w, int(h * 0.68)))
    bbox = crop.getbbox()
    if not bbox:
        raise SystemExit("logo cutout empty")
    figure = crop.crop(bbox)
    # Slight edge clean so leftover halo does not box him.
    alpha = figure.getchannel("A").filter(ImageFilter.MinFilter(3))
    figure.putalpha(alpha)
    return figure


def plate_box(src_w: int, src_h: int) -> tuple[int, int, int, int]:
    tw = int(W * PLATE)
    th = int(tw * src_h / src_w)
    x = (W - tw) // 2
    y = int((H - th) * 0.42)
    return x, y, tw, th


def _lerp(a: tuple[int, int, int], b: tuple[int, int, int], u: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))


def navy(src_w: int = 1280, src_h: int = 720) -> Image.Image:
    """Paint Seedance navy across the full canvas, aligned to the plate band."""
    _px, py, _tw, th = plate_box(src_w, src_h)
    col = Image.new("RGB", (1, H), SEED_TOP)
    px = col.load()
    for y in range(H):
        if y <= py:
            c = SEED_TOP
        elif y >= py + th - 1:
            c = SEED_BOT
        else:
            t = (y - py) / max(1, th - 1)
            if t < 0.35:
                c = _lerp(SEED_TOP, SEED_MID, t / 0.35)
            else:
                c = _lerp(SEED_MID, SEED_BOT, (t - 0.35) / 0.65)
        px[0, y] = c
    return col.resize((W, H), Image.Resampling.BILINEAR)


def extract_src() -> list[Path]:
    RAW_FRAMES.mkdir(parents=True, exist_ok=True)
    existing = sorted(RAW_FRAMES.glob("s-*.png"))
    if existing:
        return existing
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(SRC),
            "-vf", "fps=24",
            str(RAW_FRAMES / "s-%04d.png"),
        ],
        check=True,
    )
    return sorted(RAW_FRAMES.glob("s-*.png"))


def paste_plate(canvas: Image.Image, plate: Image.Image) -> None:
    x, y, tw, th = plate_box(plate.width, plate.height)
    fitted = plate.resize((tw, th), Image.Resampling.LANCZOS).convert("RGBA")
    feather = max(24, int(min(tw, th) * 0.18))
    mask = Image.new("L", (tw, th), 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(
        (feather, feather, tw - feather - 1, th - feather - 1),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(feather * 0.55))
    fitted.putalpha(mask)
    canvas.paste(fitted, (x, y), fitted)


def paste_logo(canvas: Image.Image, figure: Image.Image, opacity: float) -> None:
    target_w = int(W * 0.28)
    ratio = figure.height / figure.width
    sprite = figure.resize((target_w, max(8, int(target_w * ratio))), Image.Resampling.LANCZOS)
    if opacity < 1:
        a = sprite.getchannel("A").point(lambda v: int(v * opacity))
        sprite.putalpha(a)
    x = (W - sprite.width) // 2
    y = int((H - sprite.height) * 0.40)
    canvas.paste(sprite, (x, y), sprite)


def encode(mp4: Path, webm: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-framerate", str(FPS),
            "-i", str(FRAMES / "f-%04d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-movflags", "+faststart", "-an",
            str(mp4),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(mp4),
            "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32",
            "-row-mt", "1", "-cpu-used", "3", "-an",
            str(webm),
        ],
        check=True,
    )


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)
    if FRAMES.exists():
        for old in FRAMES.glob("*.png"):
            old.unlink()
    FRAMES.mkdir(parents=True, exist_ok=True)

    figure = logo_cutout()
    figure.save(OUT / "logo-cutout.png")
    src_frames = extract_src()
    probe = Image.open(src_frames[0])
    sky = navy(probe.width, probe.height)
    n = len(src_frames)
    fade_n = int(FADE * FPS)
    hold_n = int(HOLD * FPS)
    total = n + hold_n
    fly_end = n - 1

    for i in range(total):
        frame = sky.copy()
        if i <= fly_end:
            plate = Image.open(src_frames[i]).convert("RGB")
            paste_plate(frame, plate)
            if i > fly_end - fade_n:
                t = (i - (fly_end - fade_n)) / fade_n
                paste_logo(frame, figure, t)
        else:
            paste_logo(frame, figure, 1.0)
        frame.save(FRAMES / f"f-{i:04d}.png")
        if i % 48 == 0:
            print("frame", i, "/", total)

    mp4 = OUT / "character-fly-natural.mp4"
    webm = OUT / "character-fly-natural.webm"
    encode(mp4, webm)
    Image.open(FRAMES / f"f-{total - 1:04d}.png").save(OUT / "character-fly-still.png")
    print("wrote", mp4, mp4.stat().st_size)
    print("wrote", webm, webm.stat().st_size)


if __name__ == "__main__":
    main()
