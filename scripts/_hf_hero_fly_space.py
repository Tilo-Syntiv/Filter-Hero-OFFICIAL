"""Hugging Face image-to-video fallback for the full-bleed space-flight plate."""

from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import InferenceClient

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")
ENV_PATH = ROOT / ".env"
STILL = ROOT / "client" / "public" / "hero" / "character-fly-still.png"
OUT = ROOT / "tmp" / "hero-fly-space"
RAW = OUT / "character-fly-space-hf.mp4"

PROMPT = (
    "The exact 2D illustrated Filter Hero superhero from the image is already flying "
    "through empty navy website sky that fills the entire 16:9 frame to every edge. "
    "Weightless natural flight: glide, slow roll, kick to change heading, climb, settle. "
    "Not a circle, oval, orbit, or figure-eight. Cape floats with the motion. "
    "Same red horned mask, white eye slits, red chest, navy cape and legs. "
    "Seamless navy gradient #1b3258 to #23406a. No warehouse, particles, text, or extra people."
)
NEG = (
    "circle, orbit, figure-eight, warehouse, sparkles, dust, photoreal, 3D CGI, "
    "text, logos, extra characters, letterbox, framed plate"
)


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def main() -> None:
    load_env()
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        raise SystemExit("HF_TOKEN is not set")
    if not STILL.exists():
        raise SystemExit(f"missing still {STILL}")

    OUT.mkdir(parents=True, exist_ok=True)
    ai = InferenceClient(api_key=token)
    models = (
        "Wan-AI/Wan2.2-I2V-A14B",
        "Wan-AI/Wan2.1-I2V-14B-720P",
        "Lightricks/LTX-Video",
    )
    last = None
    for model in models:
        try:
            print("video model", model)
            data = ai.image_to_video(
                STILL,
                model=model,
                prompt=PROMPT,
                negative_prompt=NEG,
            )
            RAW.write_bytes(data)
            print("wrote", RAW, RAW.stat().st_size)
            return
        except Exception as exc:
            last = exc
            print("video failed", model, type(exc).__name__)
    raise SystemExit(f"image_to_video failed: {last}")


if __name__ == "__main__":
    main()
