"""Generate a full-bleed navy sky plate: natural space-like flight, no circles.

Uses the live hero still as the start frame. Writes tmp/hero-fly-space only.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from google import genai
from google.genai import types

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
ENV_PATH = ROOT / ".env"
STILL = ROOT / "client" / "public" / "hero" / "character-fly-still.png"
OUT = ROOT / "tmp" / "hero-fly-space"
OUT_MP4 = OUT / "character-fly-space.mp4"

PROMPT = """Animate this exact 2D illustrated Filter Hero superhero from the attached still.

Identity lock — do not redesign him:
- full-head deep muted red cowl with two small pointed horns
- glowing blank white almond eye slits, no mouth, no nose
- red chest, shoulders, and arms
- red V down the center of the abdomen, navy wrapping the torso sides
- navy hips, legs, boots, thin navy wrist bands
- one long navy cape; grid lining only on the hem / underside
- clean comic-book vector / cel-shaded look

He is already flying in open empty space. Wide locked 16:9 landscape. He is a mid-size figure traveling through a seamless website-hero navy gradient that fills every edge of the frame (#1b3258 at the top, #203868 mid, #23406a at the bottom). The navy goes to all four edges so this clip can be a full-bleed website background. No letterbox, no framed plate, no vignette box.

Flight is weightless and human, the way a person would move through open space — NOT a circle, oval, orbit, or figure-eight. Vary the body:
- long glide with the chest leading
- slow roll onto one shoulder, then stabilize
- tuck, then stretch and kick to change heading
- drift, climb, then settle into another glide
- arms open and close; legs trail and adjust
- cape floats and folds with each change of direction
- he may look, bank, and push off as if there is no ground

Do not plant him. Do not slide a still. Do not repeat the same circular path. Camera may drift slowly with him but stays a wide sky shot.

Background stays that empty navy the entire time. No warehouse, architecture, beams, clouds, stars, planets, dust, sparkles, mist trails, smoke, particles, glowing energy, speed lines, lens flares, text, logos, or extra characters."""


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def client() -> genai.Client:
    load_env()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if project:
        print("veo client: vertex")
        return genai.Client(vertexai=True, project=project, location="us-central1")
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        print("veo client: api key")
        return genai.Client(api_key=key)
    raise SystemExit("no Vertex project or Gemini key")


def main() -> None:
    if not STILL.exists():
        raise SystemExit(f"missing still {STILL}")

    OUT.mkdir(parents=True, exist_ok=True)
    ai = client()
    still = types.Image.from_file(location=str(STILL))
    print("starting Veo space-flight from navy still")

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
            video.video.save(str(OUT_MP4))
            print("wrote", OUT_MP4, OUT_MP4.stat().st_size)
            return
        except Exception as exc:
            last_err = exc
            print("veo failed", i, type(exc).__name__, exc)

    raise SystemExit(f"Veo failed: {last_err}")


if __name__ == "__main__":
    main()
