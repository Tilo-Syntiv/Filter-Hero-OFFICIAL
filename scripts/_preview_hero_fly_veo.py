"""Preview-only natural flight from the official sheet. Writes tmp/hero-fly-v2 only."""

from __future__ import annotations

import os
import subprocess
import time
from io import BytesIO
from pathlib import Path

from google import genai
from google.genai import types
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
SHEET = ROOT / "tmp" / "hero-fly-v2" / "official-sheet.png"
OUT = ROOT / "tmp" / "hero-fly-v2"
STILL = OUT / "fly-still-magenta.png"
RAW = OUT / "fly-raw.mp4"
WEBM = OUT / "character-fly-preview.webm"
MP4 = OUT / "character-fly-preview-on-hero.mp4"
GIF = OUT / "character-fly-preview.gif"

PROMPT_STILL = """Using ONLY the attached official Filter Hero character sheet as identity lock, paint ONE full-body 2D illustrated shot of this exact mascot in natural superhero flight.

Design locks — copy the sheet, add nothing:
- tall muscular male
- deep red full-head mask, two short pointed horns, no mouth, no nose
- solid glowing white almond eye slits
- red sculpted chest / pectoral armor
- red downward diamond / V on the abdomen
- navy-blue arms, navy-blue legs, navy-blue boots
- long navy cape; underside shows the light-blue HVAC filter grid lining from the sheet
- same flat painted comic illustration as the sheet, not photoreal, not 3D CGI

Pose: he is actually flying — body angled forward and slightly down, not standing, not arms-crossed. Fists forward in a flight stance, legs trailing and slightly bent. Cape streams behind so the grid lining is visible.

Background MUST be a flat solid chroma MAGENTA #FF00FF wall. No hangar, no warehouse, no floor, no sky, no dust clouds, no text, no sheet labels, no extra people.

Single character, full body in frame, 16:9."""

PROMPT_VIDEO = """Animate this exact 2D illustrated Filter Hero. Keep every costume lock: red horned mask, white eye slits, red chest, red abdominal diamond, navy arms and legs, navy cape with filter-grid lining. Same painted illustration. Do not add logos, belts, armor plates, or a new face.

He FLIES NATURALLY — real flight, not a sliding still. Body banks, climbs, and levels; arms and legs shift with the motion; cape ripples and the grid lining flashes as it billows. Smooth, powerful, loop-friendly patrol.

Keep the background a flat solid chroma MAGENTA #FF00FF the entire time. No hangar, no warehouse, no floor, no scenery, no text."""


def client() -> genai.Client:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if key:
        print("gemini client: api key")
        return genai.Client(api_key=key)
    if project:
        print("gemini client: vertex", project)
        return genai.Client(vertexai=True, project=project, location="us-central1")
    raise SystemExit("GEMINI_API_KEY is not set")


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


def make_still(ai: genai.Client) -> Path:
    sheet_part = types.Part.from_bytes(data=SHEET.read_bytes(), mime_type="image/png")
    for model in (
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image-preview",
        "gemini-2.0-flash-preview-image-generation",
    ):
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
            print("still failed", model, type(exc).__name__, exc)
    raise SystemExit("could not make a flying still")


def make_video(ai: genai.Client, still_path: Path) -> Path:
    still = types.Image.from_file(location=str(still_path))
    print("starting Veo image-to-video")
    operation = ai.models.generate_videos(
        model="veo-3.1-generate-preview",
        source=types.GenerateVideosSource(prompt=PROMPT_VIDEO, image=still),
        config=types.GenerateVideosConfig(number_of_videos=1, aspect_ratio="16:9"),
    )
    while not operation.done:
        print("waiting for Veo...")
        time.sleep(12)
        operation = ai.operations.get(operation)
    if getattr(operation, "error", None):
        raise SystemExit(operation.error)
    result = operation.response or operation.result
    videos = getattr(result, "generated_videos", None)
    if not videos:
        raise SystemExit(str(result))
    video = videos[0]
    ai.files.download(file=video.video)
    RAW.parent.mkdir(parents=True, exist_ok=True)
    video.video.save(str(RAW))
    print("wrote raw", RAW, RAW.stat().st_size)
    return RAW


def key_and_preview(raw: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-vf",
            "chromakey=0xFF00FF:0.16:0.08,format=yuva420p",
            "-c:v",
            "libvpx-vp9",
            "-auto-alt-ref",
            "0",
            "-b:v",
            "0",
            "-crf",
            "28",
            "-an",
            str(WEBM),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(WEBM),
            "-f",
            "lavfi",
            "-i",
            "color=c=0x162848:s=1280x720:r=24",
            "-filter_complex",
            "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x162848",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-movflags",
            "+faststart",
            "-shortest",
            str(MP4),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(MP4),
            "-vf",
            "fps=12,scale=720:-1",
            "-loop",
            "0",
            str(GIF),
        ],
        check=True,
    )
    print("wrote", WEBM, WEBM.stat().st_size)
    print("wrote", MP4, MP4.stat().st_size)


def main() -> None:
    if not SHEET.exists():
        raise SystemExit(f"missing sheet {SHEET}")
    OUT.mkdir(parents=True, exist_ok=True)
    ai = client()
    still = make_still(ai)
    raw = make_video(ai, still)
    key_and_preview(raw)


if __name__ == "__main__":
    main()
