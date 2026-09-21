"""Preview-only transparent Filter Hero flight from the locked flying still.

Writes under tmp/hero-fly-preview/. Does not touch client/public/hero/.
"""

from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import remove

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
STILL = ROOT / "client" / "public" / "hero" / "character-fly-still.png"
OUT = ROOT / "tmp" / "hero-fly-preview"
FRAMES = OUT / "_frames"
CUTOUT = OUT / "character-cutout.png"
WEBM = OUT / "character-fly-preview.webm"
MP4 = OUT / "character-fly-preview-on-hero.mp4"
CONTACT = OUT / "preview-contact.png"

CANVAS = (1280, 720)
CHAR_H = 560
N = 96
FPS = 24
AMP_X = 86.0
AMP_Y = 38.0


def bilinear(arr: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    xa = (x - x0)[..., None]
    ya = (y - y0)[..., None]
    ia = arr.astype(np.float32)
    return (
        ia[y0, x0] * (1 - xa) * (1 - ya)
        + ia[y0, x1] * xa * (1 - ya)
        + ia[y1, x0] * (1 - xa) * ya
        + ia[y1, x1] * xa * ya
    )


def isolate(src: Image.Image) -> Image.Image:
    cut = remove(src.convert("RGBA")).convert("RGBA")
    arr = np.asarray(cut).copy()
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = np.where(mx > 1.0, (mx - mn) / mx, 0.0)
    # Keep painted reds/blues and the existing white sparkles. Drop leftover hangar.
    keep = (sat > 0.18) | (mx > 210)
    alpha *= keep
    # Soften the cut so hangar fringe does not halo on the site navy.
    arr[:, :, 3] = np.clip(alpha, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    a = img.split()[3].filter(ImageFilter.GaussianBlur(0.6))
    img.putalpha(a)
    bbox = img.getbbox()
    if not bbox:
        raise SystemExit("cutout is empty")
    pad = 28
    box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(img.width, bbox[2] + pad),
        min(img.height, bbox[3] + pad),
    )
    return img.crop(box)


def cape_weights(arr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=np.float32)
    alpha = arr[:, :, 3].astype(np.float32) / 255.0
    # Cape and sparkle trail sit behind (left of) the flying body.
    cape = np.clip((w * 0.52 - xx) / (w * 0.28), 0.0, 1.0)
    cape *= np.clip((h * 0.82 - yy) / (h * 0.55), 0.2, 1.0)
    cape *= alpha
    body = alpha * (1.0 - cape * 0.85)
    return cape, body


def hero_backdrop(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, (22, 40, 72))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(18 + (26 - 18) * t)
        g = int(34 + (48 - 34) * t)
        b = int(64 + (88 - 64) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("isolating", STILL)
    cut = isolate(Image.open(STILL))
    ratio = CHAR_H / cut.height
    cut = cut.resize(
        (max(1, round(cut.width * ratio)), CHAR_H),
        Image.Resampling.LANCZOS,
    )
    cut.save(CUTOUT)
    print("wrote", CUTOUT, cut.size)

    arr = np.asarray(cut)
    cape, body = cape_weights(arr)
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=np.float32)

    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir(parents=True)
    cw, ch = CANVAS
    backdrop = hero_backdrop(CANVAS)

    sheets: list[Image.Image] = []
    for i in range(N):
        phase = 2.0 * math.pi * i / N
        dx = (
            np.sin(yy * 0.022 + phase) * 11.0
            + np.sin(yy * 0.05 + phase * 1.7 + xx * 0.01) * 5.0
        ) * cape
        dy = (np.cos(xx * 0.016 + phase * 0.85) * 4.0) * cape
        dy += np.sin(phase) * 1.6 * body
        frame = bilinear(arr, xx - dx, yy - dy)
        frame[:, :, 3] = np.clip(frame[:, :, 3], 0, 255)
        sprite = Image.fromarray(np.round(frame).astype(np.uint8), "RGBA")
        tilt = 6.5 * math.sin(phase)
        tilted = sprite.rotate(
            tilt,
            resample=Image.Resampling.BICUBIC,
            expand=True,
            fillcolor=(0, 0, 0, 0),
        )
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        cx = cw / 2 + AMP_X * math.sin(phase)
        cy = ch / 2 + AMP_Y * math.cos(phase) - 8.0 * math.sin(2.0 * phase)
        left = int(round(cx - tilted.width / 2))
        top = int(round(cy - tilted.height / 2))
        canvas.alpha_composite(tilted, (left, top))
        canvas.save(FRAMES / f"f{i:03d}.png")
        if i in (0, 24, 48, 72):
            sheets.append(canvas)
        on_hero = backdrop.copy()
        on_hero.paste(canvas, (0, 0), canvas)
        on_hero.save(FRAMES / f"h{i:03d}.png")

    contact = Image.new("RGBA", (cw * 2, ch * 2), (0, 0, 0, 0))
    for i, sheet in enumerate(sheets):
        x = (i % 2) * cw
        y = (i // 2) * ch
        checker = Image.new("RGB", CANVAS, (18, 32, 56))
        checker.paste(sheet, (0, 0), sheet)
        contact.paste(checker, (x, y))
    contact.save(CONTACT)

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(FRAMES / "f%03d.png"),
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-auto-alt-ref",
            "0",
            "-b:v",
            "0",
            "-crf",
            "28",
            "-deadline",
            "good",
            str(WEBM),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(FRAMES / "h%03d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "20",
            "-movflags",
            "+faststart",
            str(MP4),
        ],
        check=True,
    )
    shutil.rmtree(FRAMES)
    print("wrote", WEBM, WEBM.stat().st_size)
    print("wrote", MP4, MP4.stat().st_size)
    print("wrote", CONTACT)


if __name__ == "__main__":
    main()
