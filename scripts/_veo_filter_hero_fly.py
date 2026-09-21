"""Generate a Filter Hero flight clip with Gemini Veo from the official sheet.

Reads GEMINI_API_KEY from the environment. Does not store secrets.
"""

from __future__ import annotations

import os
import time
from io import BytesIO
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
SHEET = Path(r"E:\FILTER HEROE\OFFCIAL FILTER HERO SHEET.png")
SOLO = Path(r"E:\FILTER HEROE\FILTER HERO CHARACTER ONLY.png")
OUT_DIR = ROOT / "client" / "public" / "hero"
STILL = OUT_DIR / "character-fly-still.png"
VIDEO = OUT_DIR / "character-fly-natural.mp4"

PROMPT_STILL = """Using ONLY the attached official Filter Hero character sheet as identity lock, create ONE full-body 2D illustrated shot of this exact mascot flying.

Keep every design lock from the sheet:
- tall muscular male superhero
- deep burgundy-red full-head mask with two small pointed horns
- blank glowing white almond eye slits, no mouth or nose
- red upper chest, shoulders, and arms
- navy-blue midsection, legs, and feet
- large navy cape; the UNDERSIDE must show the light-blue HVAC filter grid / mesh pattern
- same flat painted illustration style as the sheet, not photoreal, not 3D CGI

Pose: natural superhero flight, body angled forward through dark midnight-navy indoor air. Cape billows behind and to the side so the filter-mesh lining is clearly visible. Arms can uncross into a flying stance.

Scene: dusty indoor air in front of him (pollen, pet dander, gray dust motes). The cape mesh is catching those particles. Clean sparkling air trails behind him.

Single character only. No text, no labels, no arrows, no three-panel sheet, no logos, no extra people. Dark navy atmospheric background suitable for a website hero."""

PROMPT_VIDEO = """Animate this exact 2D illustrated superhero, Filter Hero, from the official character sheet. Identity must stay locked: red horned mask, glowing white eye slits, red upper body, navy legs, navy cape with HVAC filter-grid mesh on the underside, flat illustration style.

He flies naturally through a dark navy indoor-air atmosphere — powerful, smooth, not a sliding still. Cape flows and the filter-mesh lining is visible as it catches drifting dust, pollen, and pet dander. Dirty particles stick in the cape grid; a trail of cleaner air follows him. Subtle bank and climb, then he continues the patrol.

No text, no labels, no logos, no photoreal skin, no extra characters. Cinematic, loop-friendly, website hero background."""


def client() -> genai.Client:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise SystemExit("GEMINI_API_KEY is not set")
    return genai.Client(api_key=key)


def load_image(path: Path) -> types.Image:
    return types.Image.from_file(location=str(path))


def save_first_image(response, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    for cand in getattr(response, "candidates", []) or []:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                Image.open(BytesIO(inline.data)).convert("RGBA").save(dest)
                print("wrote still", dest)
                return True
    print("no image in response")
    return False


def still_from_sheet(ai: genai.Client) -> Path:
    sheet_part = types.Part.from_bytes(data=SHEET.read_bytes(), mime_type="image/png")
    models = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image-preview",
        "gemini-2.0-flash-preview-image-generation",
    ]
    last_err = None
    for model in models:
        try:
            print("still model", model)
            response = ai.models.generate_content(
                model=model,
                contents=[sheet_part, PROMPT_STILL],
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
            )
            if save_first_image(response, STILL):
                return STILL
        except Exception as exc:
            last_err = exc
            print("still failed", model, type(exc).__name__, exc)
    if SOLO.exists():
        print("falling back to character-only still")
        Image.open(SOLO).convert("RGBA").save(STILL)
        return STILL
    raise SystemExit(f"could not make a flying still: {last_err}")


def make_video(ai: genai.Client, still_path: Path) -> Path:
    still = load_image(still_path)
    print("starting Veo image-to-video")
    attempts = [
        dict(
            source=types.GenerateVideosSource(prompt=PROMPT_VIDEO, image=still),
            config=types.GenerateVideosConfig(number_of_videos=1, aspect_ratio="16:9"),
        ),
        dict(
            source=types.GenerateVideosSource(prompt=PROMPT_VIDEO),
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                aspect_ratio="16:9",
                reference_images=[
                    types.VideoGenerationReferenceImage(
                        image=load_image(SHEET),
                        reference_type="asset",
                    )
                ],
            ),
        ),
    ]
    last_err = None
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
            VIDEO.parent.mkdir(parents=True, exist_ok=True)
            video.video.save(str(VIDEO))
            print("wrote video", VIDEO, VIDEO.stat().st_size)
            return VIDEO
        except Exception as exc:
            last_err = exc
            print("veo failed", i, type(exc).__name__, exc)
    raise SystemExit(f"Veo failed: {last_err}")


def main() -> None:
    ai = client()
    still = still_from_sheet(ai)
    make_video(ai, still)


if __name__ == "__main__":
    main()
