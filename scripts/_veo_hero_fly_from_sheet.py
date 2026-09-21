"""Remake the hero fly clip from the latest character sheet.

Uses the navy flying still as the start frame and the original
character-fly-natural.mp4 only as a motion reference in the prompt.
No particle / sparkle / dust effects. Background stays site-hero navy.

Reads GEMINI_API_KEY from .env. Does not print secrets.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
SHEET = ROOT / "tmp" / "filter-hero-character-sheet.png"
STILL = ROOT / "tmp" / "filter-hero-fly-still-navy.png"
OUT_MP4 = ROOT / "client" / "public" / "hero" / "character-fly-natural.mp4"
OUT_STILL = ROOT / "client" / "public" / "hero" / "character-fly-still.png"

PROMPT = """Animate this exact 2D illustrated superhero from the attached still and character sheet. Identity lock: full-head deep muted red cowl with two small pointed horns, glowing blank white almond eye slits, no mouth or nose, red chest shoulders and arms, red V down the center of the abdomen, navy wrapping the torso sides, navy hips legs and boots, thin navy wrist bands, long navy cape. Clean comic-book vector / cel-shaded look. Same character as the three-panel sheet.

Copy ONLY the body motion of the original 8-second hero fly loop: he is already in flight, angled forward, and he keeps flying naturally — subtle bank, a little climb then level, cape billowing and folding with the air, limbs shifting like a real flyer, loop-friendly so the last frame can meet the first. Do not invent a new choreography. Do not plant him. Do not slide a still.

Background must stay a seamless empty website-hero navy gradient (#1b3258 at the top, #203868 mid, #23406a at the bottom). No warehouse, no architecture, no beams, no spotlights.

NO special effects: no dust, no pollen, no sparkles, no stars, no mist trails, no smoke, no particle streams, no glowing energy, no speed lines, no lens flares. Character and navy sky only.

No text, no labels, no logos, no extra characters, no photoreal skin."""


def load_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY is not set")


def main() -> None:
    if not SHEET.exists():
        raise SystemExit(f"missing sheet {SHEET}")
    if not STILL.exists():
        raise SystemExit(f"missing still {STILL}")

    ai = genai.Client(api_key=load_key())
    still = types.Image.from_file(location=str(STILL))
    print("starting Veo image-to-video from navy sheet still")

    attempts = [
        dict(
            source=types.GenerateVideosSource(prompt=PROMPT, image=still),
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                aspect_ratio="16:9",
                duration_seconds=8,
            ),
        ),
        dict(
            source=types.GenerateVideosSource(prompt=PROMPT, image=still),
            config=types.GenerateVideosConfig(number_of_videos=1, aspect_ratio="16:9"),
        ),
    ]

    last_err: Exception | None = None
    for i, kwargs in enumerate(attempts, 1):
        try:
            print("veo attempt", i)
            operation = ai.models.generate_videos(
                model="veo-3.1-generate-preview",
                **kwargs,
            )
            while not operation.done:
                print("waiting for Veo...")
                time.sleep(12)
                operation = ai.operations.get(operation)
            if getattr(operation, "error", None):
                raise RuntimeError(operation.error)
            result = operation.response or operation.result
            videos = getattr(result, "generated_videos", None)
            if not videos:
                raise RuntimeError(result)
            video = videos[0]
            ai.files.download(file=video.video)
            OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
            video.video.save(str(OUT_MP4))
            from shutil import copyfile

            copyfile(STILL, OUT_STILL)
            print("wrote", OUT_MP4, OUT_MP4.stat().st_size)
            return
        except Exception as exc:
            last_err = exc
            print("veo failed", i, type(exc).__name__, exc)

    raise SystemExit(f"Veo failed: {last_err}")


if __name__ == "__main__":
    main()
