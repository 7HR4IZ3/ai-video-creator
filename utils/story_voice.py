"""CPU narration worker. Spoken text and production directions remain separate."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import random
import subprocess
import tempfile
import time


def require_kokoro_language_model():
    if importlib.util.find_spec("en_core_web_sm") is None:
        raise RuntimeError(
            "Kokoro requires en_core_web_sm before synthesis. Install the pinned "
            "requirements/story/kokoro.txt into the same Python environment. "
            "The narrator will not install packages at runtime."
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--production", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", choices=["qwen3-custom", "kokoro", "chatterbox-nano", "chatterbox-turbo"], default="chatterbox-turbo")
    parser.add_argument("--save-beats", action="store_true", help="Save individual scene WAVs for listening comparisons")
    args = parser.parse_args()
    production = json.loads(args.production.read_text())
    beats = production["draft"]["beats"]
    if not beats or any(not isinstance(b.get("text"), str) or not b["text"].strip() for b in beats):
        raise ValueError("Production contains empty spoken beats")
    reference = os.getenv("TTS_REFERENCE_AUDIO")
    if reference and not Path(reference).is_file():
        raise ValueError("TTS_REFERENCE_AUDIO does not point to an existing narrator WAV")

    if args.model == "kokoro":
        require_kokoro_language_model()

    import numpy as np
    import soundfile as sf
    import torch

    seed = int(os.getenv("TTS_SEED", "42"))
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(max(1, min(os.cpu_count() or 2, int(os.getenv("TTS_CPU_THREADS", "4")))))
    started = time.perf_counter()
    profiles = json.loads((Path(__file__).resolve().parent.parent / "config" / "voice-profiles.json").read_text())
    profile = dict(profiles[args.model])
    revision = os.getenv("TTS_MODEL_REVISION", profile["revision"])
    if args.model == "kokoro":
        from kokoro import KModel, KPipeline
        from huggingface_hub import snapshot_download
        model_path = Path(snapshot_download("hexgrad/Kokoro-82M", revision=revision, allow_patterns=["config.json", "kokoro-v1_0.pth", "voices/*.pt"]))
        model = KModel(repo_id="hexgrad/Kokoro-82M", config=str(model_path / "config.json"), model=str(model_path / "kokoro-v1_0.pth")).to("cpu").eval()
        pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", model=model, device="cpu")
        voice = os.getenv("TTS_VOICE", profile["voice"])
        speed = float(os.getenv("TTS_SPEED", str(profile["speed"])))
        voice_path = model_path / "voices" / f"{voice}.pt"
        if not voice_path.is_file():
            raise ValueError(f"Kokoro voice not found: {voice}")
        profile.update(voice=voice, speed=speed)
        sample_rate = 24000

        def speak(text, direction, cue=None):
            chunks = [result.audio.detach().cpu().numpy() for result in pipeline(text, voice=str(voice_path), speed=speed)]
            if not chunks:
                raise RuntimeError("Kokoro returned no audio")
            return np.concatenate(chunks)
    elif args.model == "qwen3-custom":
        from qwen_tts import Qwen3TTSModel
        from huggingface_hub import snapshot_download
        model_path = snapshot_download("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", revision=revision)
        model = Qwen3TTSModel.from_pretrained(model_path, device_map="cpu", dtype=torch.float32,
                                             attn_implementation="eager")
        sample_rate = 24000
        speaker = os.getenv("TTS_SPEAKER", profile["speaker"])
        profile["speaker"] = speaker

        def speak(text, direction, cue=None):
            waves, rate = model.generate_custom_voice(text=text, language="English", speaker=speaker,
                instruct=f"Natural, believable spoken storytelling. Follow this scene's emotional intention without overacting. {direction}" + (f" Include a brief natural {cue}." if cue else ""),
                temperature=profile["temperature"], top_p=profile["top_p"], repetition_penalty=profile["repetition_penalty"], max_new_tokens=2048)
            if rate != sample_rate:
                raise RuntimeError(f"Unexpected Qwen sample rate {rate}")
            return waves[0]
    else:
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        from huggingface_hub import snapshot_download
        nano = args.model == "chatterbox-nano"
        model_path = snapshot_download(f"ResembleAI/{args.model}", revision=revision,
                                       allow_patterns=["*.safetensors", "*.json", "*.txt", "*.pt", "*.model"])
        model = ChatterboxTurboTTS.from_local(model_path, device="cpu", nano=nano)
        if reference:
            model.prepare_conditionals(reference)
        elif model.conds is None:
            raise ValueError("Checkpoint has no bundled voice; set TTS_REFERENCE_AUDIO to a reference longer than five seconds")
        sample_rate = model.sr

        def speak(text, direction, cue=None):
            # Nano/Turbo do not implement free-form acting instructions or CFG/exaggeration.
            if cue in {"chuckle", "laugh", "sigh"}:
                text = f"[{cue}] {text}"
            return model.generate(text, temperature=profile["temperature"], top_p=profile["top_p"],
                                  repetition_penalty=profile["repetition_penalty"]).detach().cpu().numpy().reshape(-1)

    loaded_at = time.perf_counter()
    audio = []
    timing = []
    cursor = 0
    for index, beat in enumerate(beats):
        beat_started = time.perf_counter()
        with torch.inference_mode():
            samples = np.asarray(speak(beat["text"], beat.get("direction", ""), beat.get("cue")), dtype=np.float32).reshape(-1)
        if not samples.size or not np.isfinite(samples).all() or np.max(np.abs(samples)) < 1e-5:
            raise RuntimeError(f"Beat {index + 1} produced empty, invalid, or silent audio")
        if args.save_beats:
            scene_dir = args.output.parent / "scenes"
            scene_dir.mkdir(parents=True, exist_ok=True)
            label = "".join(c if c.isalnum() else "_" for c in beat.get("expression", beat.get("role", "scene")))[:40]
            sf.write(scene_dir / f"{index + 1:02}-{label}.wav", samples, sample_rate, subtype="PCM_24")
        duration = samples.size / sample_rate
        # Catch severe omissions or runaway repetition. This is not word-level verification.
        words = len(beat["text"].split())
        if duration < words / 6 or duration > max(15, words / 0.6):
            raise RuntimeError(f"Beat {index + 1} has implausible duration {duration:.1f}s for {words} words; audition or retry")
        timing.append({"index": index, "role": beat["role"], "text": beat["text"],
                       "start": cursor / sample_rate, "end": (cursor + samples.size) / sample_rate,
                       "generationSeconds": time.perf_counter() - beat_started, "direction": beat.get("direction"), "cue": beat.get("cue")})
        audio.append(samples)
        cursor += samples.size
        if index < len(beats) - 1:
            pause = max(0, min(1000, int(beat.get("pauseAfterMs", 150))))
            silence = np.zeros(round(pause / 1000 * sample_rate), dtype=np.float32)
            audio.append(silence)
            cursor += silence.size
        print(f"[Voice] Beat {index + 1}/{len(beats)}: {duration:.1f}s", flush=True)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="story-voice-") as temp:
        wav = Path(temp) / "narration.wav"
        sf.write(wav, np.concatenate(audio), sample_rate, subtype="PCM_24")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-codec:a", "libmp3lame",
                        "-b:a", "192k", str(args.output)], check=True)
    elapsed = time.perf_counter() - started
    report = {"model": args.model, "requestedRevision": revision, "resolvedModelPath": str(model_path),
              "seed": seed, "profile": profile, "sampleRate": sample_rate, "loadSeconds": loaded_at - started,
              "totalSeconds": elapsed, "audioSeconds": cursor / sample_rate,
              "realtimeFactor": elapsed / (cursor / sample_rate), "beats": timing,
              "note": "Beat timings before MP3 encoding, not aligned word timestamps. Qwen interprets acting directions; other adapters retain them for audition only."}
    Path(str(args.output) + ".timing.json").write_text(json.dumps(report, indent=2))
    print(f"[Voice] Generated {report['audioSeconds']:.1f}s in {elapsed:.1f}s, RTF {report['realtimeFactor']:.2f}", flush=True)


if __name__ == "__main__":
    main()
