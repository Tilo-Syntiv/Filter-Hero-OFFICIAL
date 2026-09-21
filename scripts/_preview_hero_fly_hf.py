"""Preview-only natural flight via Hugging Face Inference Providers."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

from huggingface_hub import InferenceClient, whoami
from PIL import Image

ROOT = Path(r"C:\Users\lazar\Downloads\Github\FILTER HERO")

def _load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

_load_env(ROOT / ".env")

OUT = ROOT / "tmp" / "hero-fly-v2"
SHEET = OUT / "official-sheet.png"
CUTOUT = OUT / "sheet-front-cutout.png"
START = OUT / "fly-start-magenta.png"
STILL = OUT / "fly-still-magenta.png"
RAW = OUT / "fly-raw.mp4"
WEBM = OUT / "character-fly-preview.webm"
MP4 = OUT / "character-fly-preview-on-hero.mp4"
GIF = OUT / "character-fly-preview.gif"

PROMPT_FLY = (
    "The exact same 2D illustrated superhero from the reference, Filter Hero, "
    "now in natural superhero flight. Body angled forward, fists ahead, legs trailing, "
    "navy cape streaming so the light-blue HVAC filter grid lining is visible. "
    "Keep: red horned mask, glowing white eye slits, no mouth, red sculpted chest, "
    "red abdominal diamond, navy arms and legs, navy cape with grid lining. "
    "Flat painted comic style. Flat solid chroma magenta #FF00FF background only. "
    "No hangar, no warehouse, no floor, no text, no extra people, no new costume parts."
)
NEG = (
    "photoreal, 3D CGI, standing pose, arms crossed, warehouse, hangar, floor, "
    "sky, clouds, text, labels, extra characters, new logo, belt, extra armor"
)


def client() -> InferenceClient:
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        raise SystemExit("HF_TOKEN is not set")
    info = whoami(token=token)
    print("hf user", info.get("name") or info.get("fullname") or "ok")
    return InferenceClient(api_key=token)


def magenta_start() -> Path:
    canvas = Image.new("RGB", (1280, 720), (255, 0, 255))
    src = Image.open(CUTOUT if CUTOUT.exists() else SHEET).convert("RGBA")
    h = 620
    w = max(1, round(src.width * (h / src.height)))
    src = src.resize((w, h), Image.Resampling.LANCZOS)
    x = (1280 - w) // 2
    y = 720 - h - 20
    canvas.paste(src, (x, y), src)
    START.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(START)
    print("wrote start", START)
    return START


def flying_still(ai: InferenceClient, start: Path) -> Path:
    models = (
        "Qwen/Qwen-Image-Edit-2509",
        "black-forest-labs/FLUX.1-Kontext-dev",
        "black-forest-labs/FLUX.1-dev",
    )
    for model in models:
        try:
            print("still model", model)
            img = ai.image_to_image(
                start,
                prompt=PROMPT_FLY,
                negative_prompt=NEG,
                model=model,
            )
            img.convert("RGB").save(STILL)
            print("wrote still", STILL)
            return STILL
        except Exception as exc:
            print("still failed", model, type(exc).__name__, exc)
    print("using start image as still")
    Image.open(start).save(STILL)
    return STILL


def fly_video(ai: InferenceClient, still: Path) -> Path:
    models = (
        "Wan-AI/Wan2.1-I2V-14B-720P",
        "Wan-AI/Wan2.2-I2V-A14B",
        "Lightricks/LTX-Video",
    )
    last = None
    for model in models:
        try:
            print("video model", model)
            data = ai.image_to_video(
                still,
                model=model,
                prompt=PROMPT_FLY + " He flies naturally — banks, climbs, cape ripples. Loop-friendly. Magenta background stays flat.",
                negative_prompt=NEG,
            )
            RAW.write_bytes(data)
            print("wrote raw", RAW, RAW.stat().st_size)
            return RAW
        except Exception as exc:
            last = exc
            print("video failed", model, type(exc).__name__, exc)
    raise SystemExit(f"image_to_video failed: {last}")


def key_and_preview(raw: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(raw),
            "-vf", "chromakey=0xFF00FF:0.18:0.10,format=yuva420p",
            "-c:v", "libvpx-vp9", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "28", "-an",
            str(WEBM),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(WEBM),
            "-f", "lavfi", "-i", "color=c=0x162848:s=1280x720:r=24",
            "-filter_complex",
            "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x162848",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-movflags", "+faststart", "-shortest",
            str(MP4),
        ],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(MP4), "-vf", "fps=12,scale=720:-1", "-loop", "0", str(GIF)],
        check=True,
    )
    print("wrote", WEBM, WEBM.stat().st_size)
    print("wrote", MP4, MP4.stat().st_size)


def main() -> None:
    if not SHEET.exists():
        raise SystemExit(f"missing sheet {SHEET}")
    ai = client()
    start = magenta_start()
    still = flying_still(ai, start)
    raw = fly_video(ai, still)
    key_and_preview(raw)


if __name__ == "__main__":
    main()
