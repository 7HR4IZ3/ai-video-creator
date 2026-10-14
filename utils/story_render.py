"""Align approved narration and render a vertical short with FFmpeg/libass."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

RENDER_VERSION = "story-render-v1"
ALIGN_REVISION = "3d3d5dee26484f91867d81cb899cfcf72b96be6c"


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def probe(file):
    return json.loads(run([os.getenv("FFPROBE_BIN", "ffprobe"), "-v", "error", "-show_format", "-show_streams", "-of", "json", str(file)]))


def normalized(text):
    return " ".join(unicodedata.normalize("NFKC", text).split())


def validate_alignment(words, text, duration):
    if normalized("".join(w["word"] for w in words)) != normalized(text):
        raise ValueError("Alignment changed the approved narration; refusing mismatched captions")
    previous = 0.0
    for word in words:
        start, end = word["start"], word["end"]
        if not math.isfinite(start + end) or start < previous - 0.02 or end < start or end > duration + 0.15:
            raise ValueError("Invalid or unordered caption timing")
        if end - start > 3.5:
            raise ValueError("Alignment produced a word longer than 3.5 seconds; review the audio")
        previous = end
    if not words or sum(w["end"] <= w["start"] for w in words) > max(2, len(words) * 0.05):
        raise ValueError("Too many unaligned words; review the recording before rendering")


def caption_phrases(words, max_chars=30, max_words=5):
    phrases, current = [], []
    for word in words:
        combined = "".join(w["word"] for w in current + [word]).strip()
        if current and (len(combined) > max_chars or len(current) >= max_words or word["start"] - current[-1]["end"] > 0.3):
            phrases.append(current)
            current = []
        current.append(word)
        if re.search(r"[.!?;]$", word["word"].strip()):
            phrases.append(current)
            current = []
    if current:
        phrases.append(current)
    return [{"start": group[0]["start"], "end": group[-1]["end"], "text": "".join(w["word"] for w in group).strip()} for group in phrases]


def ass_time(seconds):
    value = max(0, round(seconds * 100))
    return f"{value // 360000}:{value // 6000 % 60:02}:{value // 100 % 60:02}.{value % 100:02}"


def ass_text(text):
    # Remove ASS control syntax from supplied prose rather than interpreting it.
    return text.replace("\\", "／").replace("{", "(").replace("}", ")").replace("\n", " ").replace("\r", " ")


def make_ass(phrases, title, duration):
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,4,2,2,100,150,360,1
Style: Title,DejaVu Sans,48,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,8,110,150,270,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    # The title sits above the picture's center; captions stay clear of the bottom UI area.
    rows = [f"Dialogue: 0,0:00:00.00,{ass_time(min(duration, 2.8))},Title,,0,0,0,,{ass_text(title[:90])}"]
    for index, phrase in enumerate(phrases):
        next_start = phrases[index + 1]["start"] if index + 1 < len(phrases) else duration
        end = min(duration, next_start, phrase["end"] + 0.12)
        if end > phrase["start"]:
            rows.append(f"Dialogue: 1,{ass_time(phrase['start'])},{ass_time(end)},Caption,,0,0,0,,{ass_text(phrase['text'])}")
    return header + "\n".join(rows) + "\n"


def align_audio(audio, text, audio_hash):
    import torch
    import stable_whisper
    from huggingface_hub import snapshot_download
    torch.set_num_threads(min(4, os.cpu_count() or 2))
    checkpoint = snapshot_download("Systran/faster-whisper-base.en", revision=ALIGN_REVISION)
    model = stable_whisper.load_faster_whisper(checkpoint, device="cpu", compute_type="int8", cpu_threads=min(4, os.cpu_count() or 2))
    print("[Editor] Aligning the approved narration", flush=True)
    # Alignment estimates times for supplied words; it does not write a new transcript.
    result = model.align(str(Path(audio).resolve()), text, language="en", original_split=True)
    if result is None:
        raise RuntimeError("Narration could not be aligned")
    words = [word.to_dict() for segment in result.segments for word in segment.words]
    alignment = {"version": RENDER_VERSION, "audioSha256": audio_hash, "text": text,
                 "model": "Systran/faster-whisper-base.en", "revision": ALIGN_REVISION, "words": words}
    del model
    return alignment


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--production", required=True, type=Path)
    parser.add_argument("--audio", required=True, type=Path)
    parser.add_argument("--background", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--alignment", type=Path, help="Reuse a previously verified alignment for this audio and script")
    args = parser.parse_args()
    ffmpeg = os.getenv("FFMPEG_BIN", "ffmpeg")
    if "subtitles" not in run([ffmpeg, "-hide_banner", "-filters"]) and not os.getenv("FFMPEG_BIN"):
        for candidate in ["/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg", "/usr/local/opt/ffmpeg-full/bin/ffmpeg"]:
            if Path(candidate).is_file() and "subtitles" in run([candidate, "-hide_banner", "-filters"]):
                ffmpeg = candidate
                break
    if "subtitles" not in run([ffmpeg, "-hide_banner", "-filters"]):
        raise RuntimeError("FFmpeg needs the subtitles/libass filter. On macOS use ffmpeg-full and set FFMPEG_BIN/FFPROBE_BIN; Ubuntu's ffmpeg package includes it.")
    for file in [args.production, args.audio, args.background]:
        if not file.is_file():
            raise ValueError(f"Missing production input: {file}")
    production = json.loads(args.production.read_text())
    text = production["narration"]
    audio_info = probe(args.audio)
    duration = float(audio_info["format"]["duration"])
    background_info = probe(args.background)
    if not any(s["codec_type"] == "video" for s in background_info["streams"]):
        raise ValueError("Background has no video stream")
    if duration < 1 or duration > 240:
        raise ValueError(f"Narration duration {duration:.1f}s is outside one to 240 seconds")
    audio_hash = hashlib.sha256(args.audio.read_bytes()).hexdigest()
    alignment = None
    if args.alignment and args.alignment.is_file():
        saved = json.loads(args.alignment.read_text())
        if saved.get("audioSha256") == audio_hash and saved.get("text") == text and saved.get("version") == RENDER_VERSION:
            alignment = saved
    if alignment is None:
        alignment = align_audio(args.audio, text, audio_hash)
    validate_alignment(alignment["words"], text, duration)
    phrases = caption_phrases(alignment["words"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.with_suffix(".alignment.json").write_text(json.dumps(alignment, indent=2))
    args.output.with_suffix(".captions.json").write_text(json.dumps(phrases, indent=2))
    ass = make_ass(phrases, production["draft"]["title"], duration)
    args.output.with_suffix(".ass").write_text(ass)
    with tempfile.TemporaryDirectory(prefix="story-render-") as directory:
        temp = Path(directory)
        (temp / "captions.ass").write_text(ass)
        pending = args.output.with_name(args.output.stem + ".pending.mp4").resolve()
        filters = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,eq=brightness=-0.035,subtitles=captions.ass"
        print(f"[Editor] Rendering {duration:.1f}s at 1080x1920", flush=True)
        command = [ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-stream_loop", "-1", "-ss", str(max(0, args.start)),
                   "-i", str(args.background.resolve()), "-i", str(args.audio.resolve()), "-t", str(duration),
                   "-map", "0:v:0", "-map", "1:a:0", "-vf", filters, "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                   "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-threads", "4", str(pending)]
        subprocess.run(command, cwd=temp, check=True)
        output = probe(pending)
        video = next(s for s in output["streams"] if s["codec_type"] == "video")
        if (video["width"], video["height"]) != (1080, 1920) or not any(s["codec_type"] == "audio" for s in output["streams"]):
            raise RuntimeError("Rendered video failed dimension/audio verification")
        if abs(float(output["format"]["duration"]) - duration) > 0.3:
            raise RuntimeError("Rendered video duration does not match the narration")
        pending.replace(args.output)
    print(f"[Editor] Saved {args.output}", flush=True)


if __name__ == "__main__":
    main()
