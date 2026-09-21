"""Bake a full-bleed navy sky plate: weightless flight, no circles."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
POSES_DIR = ROOT / "client" / "public" / "hero" / "fly-poses"
OUT = ROOT / "tmp" / "hero-fly-space"
FRAMES = OUT / "frames"
W, H, FPS, SECS = 1920, 1080, 24, 16
NAVY_TOP = (27, 50, 88)
NAVY_MID = (32, 56, 104)
NAVY_BOT = (35, 64, 106)

POSES = {
    "cruise": {"file": "cruise.png", "pitch": 0.04},
    "stroke": {"file": "stroke.png", "pitch": 0.38},
    "climb": {"file": "climb.png", "pitch": -0.72},
    "dive": {"file": "dive.png", "pitch": 0.88},
    "bank": {"file": "bank.png", "pitch": 0.18},
}

# Wander through open sky. No oval / orbit / figure-eight.
# Each point is (nx, ny, scale) in 0-1 of the frame.
WAYPOINTS = [
    (0.22, 0.50, 0.40),
    (0.40, 0.38, 0.42),
    (0.60, 0.44, 0.38),
    (0.78, 0.34, 0.36),
    (0.70, 0.58, 0.40),
    (0.48, 0.48, 0.38),
    (0.30, 0.36, 0.36),
    (0.18, 0.54, 0.40),
    (0.22, 0.50, 0.40),
]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def clamp(v: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, v))


def cr(p0: float, p1: float, p2: float, p3: float, t: float) -> float:
    t2 = t * t
    t3 = t2 * t
    return 0.5 * (
        2 * p1
        + (-p0 + p2) * t
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
        + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )


def spline(pts: list[tuple[float, float, float]], t: float) -> tuple[float, float, float]:
    segs = len(pts) - 1
    u = clamp(t, 0, 0.999999) * segs
    i = int(u)
    f = u - i

    def p(k: int) -> tuple[float, float, float]:
        return pts[clamp(k, 0, segs)]

    a, b, c, d = p(i - 1), p(i), p(i + 1), p(i + 2)
    return (
        cr(a[0], b[0], c[0], d[0], f),
        cr(a[1], b[1], c[1], d[1], f),
        cr(a[2], b[2], c[2], d[2], f),
    )


def sky() -> Image.Image:
    col = Image.new("RGB", (1, H), NAVY_MID)
    px = col.load()
    for y in range(H):
        t = y / (H - 1)
        if t < 0.52:
            u = t / 0.52
            c = tuple(int(lerp(NAVY_TOP[i], NAVY_MID[i], u)) for i in range(3))
        else:
            u = (t - 0.52) / 0.48
            c = tuple(int(lerp(NAVY_MID[i], NAVY_BOT[i], u)) for i in range(3))
        px[0, y] = c
    return col.resize((W, H), Image.Resampling.BILINEAR)


def cutout(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGBA")
    bbox = src.getbbox()
    if not bbox:
        return src
    return src.crop(bbox)


def pick_pose(heading: float, turn: float, clock: float) -> str:
    down = math.sin(heading)
    if abs(turn) > 1.7:
        return "bank"
    if down < -0.58:
        return "climb"
    if down > 0.62:
        return "dive"
    return "cruise" if (clock % 1.6) < 0.9 else "stroke"


def paste_flyer(
    frame: Image.Image,
    pose: Image.Image,
    cx: float,
    cy: float,
    scale_w: float,
    angle: float,
    flip: bool,
) -> None:
    target_w = max(8, int(W * scale_w))
    ratio = pose.height / pose.width
    sprite = pose.resize((target_w, max(8, int(target_w * ratio))), Image.Resampling.LANCZOS)
    if flip:
        sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    deg = -math.degrees(angle)
    rotated = sprite.rotate(deg, resample=Image.Resampling.BICUBIC, expand=True)
    x = int(cx - rotated.width / 2)
    y = int(cy - rotated.height / 2)
    frame.paste(rotated, (x, y), rotated)


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
            "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-an",
            str(webm),
        ],
        check=True,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if FRAMES.exists():
        for old in FRAMES.glob("*.png"):
            old.unlink()
    FRAMES.mkdir(parents=True, exist_ok=True)

    poses = {key: cutout(POSES_DIR / spec["file"]) for key, spec in POSES.items()}
    base = sky()
    n = FPS * SECS
    samples = [spline(WAYPOINTS, i / (n - 1)) for i in range(n)]
    heading = math.atan2(samples[1][1] - samples[0][1], samples[1][0] - samples[0][0])

    for i, (nx, ny, sc) in enumerate(samples):
        nxt = samples[min(i + 1, n - 1)]
        raw = math.atan2(nxt[1] - ny, nxt[0] - nx)
        delta = math.atan2(math.sin(raw - heading), math.cos(raw - heading))
        heading += delta * 0.18
        turn = delta * FPS
        key = pick_pose(heading, turn, i / FPS)
        pitch = POSES[key]["pitch"] * 0.28
        flip = math.cos(heading) < 0
        art_angle = heading + (-pitch if flip else pitch)
        frame = base.copy()
        paste_flyer(frame, poses[key], nx * W, ny * H, sc, art_angle, flip)
        frame.save(FRAMES / f"f-{i:04d}.png")
        if i % 48 == 0:
            print("frame", i, key)

    mp4 = OUT / "character-fly-space.mp4"
    webm = OUT / "character-fly-space.webm"
    encode(mp4, webm)
    Image.open(FRAMES / "f-0000.png").save(OUT / "character-fly-still.png")
    print("wrote", mp4, mp4.stat().st_size)
    print("wrote", webm, webm.stat().st_size)


if __name__ == "__main__":
    main()
