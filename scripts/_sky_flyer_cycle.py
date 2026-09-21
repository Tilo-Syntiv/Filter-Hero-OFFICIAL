"""Build a short fly-cycle sheet from the vector cutout so the cape and limbs move."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "client" / "public" / "hero" / "character-sky-fly.png"
OUT = ROOT / "client" / "public" / "hero" / "character-sky-fly-cycle.webp"
FRAMES = 8


def bilinear(arr: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    x1 = x0 + 1
    y1 = y0 + 1
    xa = (x - x0)[..., None]
    ya = (y - y0)[..., None]
    ia = arr.astype(np.float32)
    return (
        ia[y0, x0] * (1 - xa) * (1 - ya)
        + ia[y0, x1] * xa * (1 - ya)
        + ia[y1, x0] * (1 - xa) * ya
        + ia[y1, x1] * xa * ya
    )


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    arr = np.asarray(src)
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=np.float32)
    alpha = arr[:, :, 3].astype(np.float32) / 255.0

    # Cape is the left/rear half of this right-facing flyer
    cape = np.clip((0.48 * w - xx) / (0.36 * w), 0.0, 1.0)
    cape *= np.clip((h * 0.92 - yy) / (h * 0.72), 0.2, 1.0)
    cape *= alpha

    # Trailing legs sit low-center
    legs = np.clip((yy - h * 0.46) / (h * 0.40), 0.0, 1.0)
    legs *= np.clip(1.0 - np.abs(xx - w * 0.52) / (w * 0.28), 0.0, 1.0)
    legs *= alpha * (1.0 - cape * 0.65)

    body = np.clip(alpha - cape * 0.85 - legs * 0.45, 0.0, 1.0)
    frames: list[Image.Image] = []

    for i in range(FRAMES):
        phase = 2.0 * math.pi * i / FRAMES
        dx = (
            np.sin(yy * 0.045 + phase) * 11.0
            + np.sin(yy * 0.09 + phase * 1.7 + xx * 0.02) * 5.0
        ) * cape
        dy = (np.cos(xx * 0.03 + phase * 0.9) * 5.5) * cape
        dx += np.sin(phase + yy * 0.03) * 3.4 * legs
        dy += np.cos(phase * 1.2 + xx * 0.02) * 4.8 * legs
        dy += np.sin(phase) * 1.8 * body
        dx += np.cos(phase * 0.5) * 0.8 * body
        frame = bilinear(arr, xx - dx, yy - dy)
        frame[:, :, 3] = np.clip(frame[:, :, 3], 0, 255)
        frames.append(Image.fromarray(np.round(frame).astype(np.uint8), "RGBA"))

    sheet = Image.new("RGBA", (w * FRAMES, h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0), frame)
    sheet.save(OUT, "WEBP", quality=92, method=6)
    print(f"wrote {OUT} {sheet.size} frames={FRAMES}")


if __name__ == "__main__":
    main()
