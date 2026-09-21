"""Cut the white studio background from the flying vector, keep the eyes."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\lazar\.cursor\projects\c-Users-lazar-Downloads-Github-FILTER-HERO\assets\c__Users_lazar_AppData_Roaming_Cursor_User_workspaceStorage_ad16a225044dfe5ba0ce41ca8cfb7c5c_images_Untitled_design-59737e86-9299-44ab-a0eb-274cefb5f5ee.png"
)
OUT = Path(__file__).resolve().parents[1] / "client" / "public" / "hero" / "character-sky-fly.png"


def is_studio(px: tuple[int, int, int, int]) -> bool:
    r, g, b, _a = px
    return r >= 232 and g >= 232 and b >= 232 and abs(r - g) < 14 and abs(g - b) < 14


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    pix = im.load()
    assert pix is not None
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    seeds.extend((x, 0) for x in range(0, w, 8))
    seeds.extend((x, h - 1) for x in range(0, w, 8))
    seeds.extend((0, y) for y in range(0, h, 8))
    seeds.extend((w - 1, y) for y in range(0, h, 8))
    q.extend(seeds)

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x]:
            continue
        if not is_studio(pix[x, y]):
            continue
        bg[y][x] = True
        pix[x, y] = (255, 255, 255, 0)
        q.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if pix[x, y][3] > 8:
                xs.append(x)
                ys.append(y)
    pad = 12
    box = (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(w, max(xs) + pad + 1),
        min(h, max(ys) + pad + 1),
    )
    cropped = im.crop(box)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT, "PNG")
    print(f"wrote {OUT} {cropped.size}")


if __name__ == "__main__":
    main()
