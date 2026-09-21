"""Loop a standing Filter Hero still with a blowing cape. Pose stays locked."""

from pathlib import Path
import subprocess
import shutil

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
SRC = ROOT / "client" / "public" / "hero" / "character.png"
OUT = ROOT / "client" / "public" / "hero" / "character-idle.webm"
FRAMES = ROOT / "client" / "public" / "hero" / "_idle_frames"

WIDTH = 900
FRAMES_N = 48
FPS = 24
PY = r"C:\Users\lazar\AppData\Local\Programs\Python\Python312\python.exe"


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
    ratio = WIDTH / src.width
    size = (WIDTH, max(1, round(src.height * ratio)))
    src = src.resize(size, Image.Resampling.LANCZOS)
    arr = np.asarray(src)
    h, w = arr.shape[:2]
    yy, xx = np.indices((h, w), dtype=np.float32)
    alpha = arr[:, :, 3].astype(np.float32) / 255.0

    cape = np.clip((xx - w * 0.40) / (w * 0.30), 0.0, 1.0)
    cape *= np.clip((h * 0.78 - yy) / (h * 0.50), 0.25, 1.0)
    cape *= alpha
    body = alpha * (1.0 - cape)

    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir(parents=True)

    for i in range(FRAMES_N):
        phase = 2.0 * np.pi * i / FRAMES_N
        dx = (
            np.sin(yy * 0.026 + phase) * 12.0
            + np.sin(yy * 0.058 + phase * 1.65 + xx * 0.012) * 5.5
        ) * cape
        dy = (np.cos(xx * 0.018 + phase * 0.8) * 4.2) * cape
        dy += np.sin(phase) * 1.4 * body

        frame = bilinear(arr, xx - dx, yy - dy)
        frame[:, :, 3] = np.clip(frame[:, :, 3], 0, 255)
        Image.fromarray(np.round(frame).astype(np.uint8), "RGBA").save(
            FRAMES / f"f{i:03d}.png",
            optimize=True,
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
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
            "32",
            "-deadline",
            "good",
            str(OUT),
        ],
        check=True,
    )
    shutil.rmtree(FRAMES)
    print("wrote", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
