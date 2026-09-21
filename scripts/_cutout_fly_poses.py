"""Cut white studio backgrounds from the generated flight poses."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

SRC_DIR = Path(r"C:\Users\lazar\.cursor\projects\c-Users-lazar-Downloads-Github-FILTER-HERO\assets")
OUT_DIR = Path(__file__).resolve().parents[1] / "client" / "public" / "hero" / "fly-poses"
POSES = ("cruise", "stroke", "climb", "dive", "bank")


def is_studio(px: tuple[int, int, int, int]) -> bool:
    r, g, b, _a = px
    return r >= 232 and g >= 232 and b >= 232 and abs(r - g) < 16 and abs(g - b) < 16


def cutout(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    pix = im.load()
    assert pix is not None
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    seeds.extend((x, 0) for x in range(0, w, 6))
    seeds.extend((x, h - 1) for x in range(0, w, 6))
    seeds.extend((0, y) for y in range(0, h, 6))
    seeds.extend((w - 1, y) for y in range(0, h, 6))
    q.extend(seeds)
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        if not is_studio(pix[x, y]):
            continue
        seen[y][x] = True
        pix[x, y] = (255, 255, 255, 0)
        q.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if pix[x, y][3] > 8:
                xs.append(x)
                ys.append(y)
    pad = 16
    box = (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(w, max(xs) + pad + 1),
        min(h, max(ys) + pad + 1),
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    cropped = im.crop(box)
    cropped.save(dest, "PNG")
    print(f"wrote {dest.name} {cropped.size}")


def main() -> None:
    for name in POSES:
        src = SRC_DIR / f"fly-pose-{name}.png"
        if not src.exists():
            raise SystemExit(f"missing {src}")
        cutout(src, OUT_DIR / f"{name}.png")


if __name__ == "__main__":
    main()
