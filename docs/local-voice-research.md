# Local narration research

Verified against primary sources on 2026-10-14. This is source research, not a listening test or a benchmark on this computer. No models were installed or downloaded. Context7 was used to resolve and query `/blaizzy/mlx-audio`, then cross-checked against upstream documentation.

## Recommendation

The user prioritizes voice quality over model size or runtime. The audition workflow therefore includes Qwen3-TTS 1.7B CustomVoice as the main direction-controllable candidate, Chatterbox Turbo and Nano, and Kokoro as a baseline. The CPU practicality discussion below is an operating-cost comparison, not a reason to select the smallest voice before listening.

For the clarified target—**standard Ubuntu CPU-only GitHub Actions**—start with **Kokoro-82M as the dependable small baseline**, and audition **Chatterbox Nano** for a more expressive CPU alternative. Keep Qwen3-TTS 1.7B as an optional quality audition when runtime budgets permit, rather than the automated default. MLX is an Apple-only local development option and must not be used by the Ubuntu worker. This recommendation concerns deployment practicality and controls, not an established quality ranking.

Do not select a narrator from a leaderboard alone. Render the same suspense, embarrassment, confrontation, and quiet-payoff passages with each candidate, without music. Reject omitted/repeated words, inconsistent identity, clipped endings, and exaggerated acting before scoring preference. Measure generation time and peak memory on the actual machine.

## Candidates

### Qwen3-TTS: controllable optional audition

The official release is dated January 22, 2026 and includes 0.6B and 1.7B checkpoints. **1.7B CustomVoice** supports nine preset speakers and natural-language delivery instructions; English-native presets include Ryan and Aiden. **1.7B VoiceDesign** creates voices from descriptions. **Base** checkpoints clone a reference voice; the published cloning interface takes reference audio and its transcript. These are separate checkpoints, not interchangeable modes. The official model table marks instruction control for the 1.7B CustomVoice and VoiceDesign models, but not the 0.6B CustomVoice model. Models are Apache-2.0. The official implementation demonstrates CUDA inference. [Qwen upstream](https://github.com/QwenLM/Qwen3-TTS)

MLX Audio provides an Apple Silicon implementation and quantized checkpoints. Its Qwen adapter exposes `generate_custom_voice` with `speaker`, `language`, and `instruct`; its model documentation covers CustomVoice, VoiceDesign, and Base. Use the 1.7B CustomVoice variant when performance directions matter; use 0.6B as a speed comparison rather than assuming equivalent control. MLX is a community port, distinct from the upstream CUDA implementation. [MLX Qwen documentation](https://github.com/Blaizzy/mlx-audio/blob/main/mlx_audio/tts/models/qwen3_tts/README.md)

### Chatterbox: expressive alternative, with several distinct models

The upstream repository currently lists Turbo (350M English), Nano (110M English), Multilingual V3 (500M), and the original English model. Turbo supports vocal-event tags such as laughter and a voice-reference clip. The original supports exaggeration and classifier-free-guidance controls. The repository is MIT licensed. The documented development environment is Debian/Python 3.11; CUDA examples do not establish Mac throughput. The original model has an official Mac example selecting MPS when available. Do not assume that example validates Turbo on MPS. [Repository and model table](https://github.com/resemble-ai/chatterbox), [official Mac example](https://github.com/resemble-ai/chatterbox/blob/master/example_for_mac.py)

Chatterbox Flash also exists as a separate block-diffusion research implementation. Treat it as a later audition candidate, not a drop-in Turbo upgrade. Its existence alone does not prove this project's hardware or dependency compatibility. [Flash repository](https://github.com/resemble-ai/chatterbox-flash)

### Kokoro: useful baseline and preview voice

Kokoro-82M is a small Apache-2.0 model. Its upstream pipeline returns generated chunks and audio; it supports preset voices and speed adjustment. It is a reasonable cheap preview/control condition, but the reviewed interface does not offer the same free-form emotional directions or reference-voice cloning as Qwen's larger variants. Do not confuse low model size with poor quality without listening. [Model card](https://huggingface.co/hexgrad/Kokoro-82M), [upstream usage](https://github.com/hexgrad/kokoro)

### Fish S2 Pro: expressive, but unsuitable as an unrestricted default

S2 Pro exposes inline natural-language emotion/prosody tags and multi-speaker generation. Its architecture contains a 4B slow model plus a 400M fast model. The published low-latency measurements are on an NVIDIA H200, not a Mac. Its weights use the **Fish Audio Research License**: research/noncommercial use is free; commercial use requires a separate license. That prevents treating it as an unrestricted default for monetized story output. [Official model card and license summary](https://huggingface.co/fishaudio/s2-pro)

The current Fish repository also advertises **Drama 3**, a larger 35B-A3B model with revision and infilling features, under a different community license. The repository explicitly says S2 Pro retains its research license. Newer repository licensing therefore must not be applied retroactively to S2 Pro weights. Drama 3 needs its own license/hardware evaluation before consideration. [Fish upstream](https://github.com/fishaudio/fish-speech)

### Higgs TTS 3: later audition, license-specific

Higgs TTS 3 provides voice cloning and inline emotion/style/prosody controls. Its creator grant permits monetized videos with prominent attribution, while embedding or hosting the model in a product requires a separate commercial license. This distinction matters for a distributable video application. Its reported server speed uses an H100 and is not a Mac promise. [Official model card](https://huggingface.co/bosonai/higgs-tts-3-4b)

## Optional Mac development path

MLX Audio documents Apple Silicon, Python 3.10+, MLX, and FFmpeg for compressed audio output. It supports Kokoro, Qwen3-TTS, Chatterbox multilingual, and other architectures, but support in a library is not evidence of acceptable memory or speed on this Mac. It also supplies an OpenAI-compatible server, so a Bun application can call a separate local Python worker. Pin the worker version and model revision after evaluation. [MLX Audio requirements and supported models](https://github.com/Blaizzy/mlx-audio)

No credible minimum RAM/VRAM or runtime for the deployment runner was established. Do not promise real-time generation based on these sources.

## Captions and quality gate

TTS chunk boundaries are not word timestamps. Generate short coherent story beats, preserve their exact spoken text, concatenate with deliberate pauses, then align the final waveform against that text. MLX Audio documents **Qwen3-ForcedAligner** with word start/end times; this is a better conceptual fit than allowing a fresh transcript to silently rewrite approved captions. [Forced alignment example](https://github.com/Blaizzy/mlx-audio#qwen3-asr--forcedaligner)

Proposed acceptance procedure (product decisions, not published model capabilities):

1. Use the same 30–60 second script for every voice audition, and a longer 3-minute script to expose drift.
2. Listen blind for believable intent, pronunciation, phrase rhythm, and consistent identity.
3. Check audio against the approved text; reject omitted or added words and retry only the failed beat.
4. Check the joins, clipping, loudness, and caption alignment after assembly.
5. Save model revision, voice settings, seed where supported, reference identity, and generation timings with each take.

A new voice cannot fix a flat script. Narration should receive beat-level intent (for example, restrained disbelief) separately from spoken words, with renderer-specific control tags generated by the voice adapter. Never send one model's tags blindly to another model.

## GitHub Actions CPU deployment

Chatterbox Nano is a particularly relevant newer candidate: its official MIT model card explicitly supports CPU inference through the Turbo class with `nano=True`, and claims three times real time on eight CPU cores. The card supplies no equivalent GitHub Actions measurement. Do not extrapolate that result to a smaller shared runner. It supports vocal tags and reference-voice input. [Nano model card](https://huggingface.co/ResembleAI/chatterbox-nano)

GitHub documents different standard Linux resources for public and private repositories; the common x64 Ubuntu public runner has four CPUs and 16 GB RAM, while private repository standard Linux runners have two CPUs and 8 GB. Larger/GPU runners are a different offering. These resources make small CPU models the sensible baseline, but do not establish synthesis speed. [GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

Proposed CI policy: pin the Ubuntu image, Python minor version, dependency lock, model repository revision, and voice asset checksum. Cache model weights using the model revision in the cache key; cache Python downloads separately. Emit cold-start/download time, warm synthesis time, generated duration, and peak memory. Run a short smoke narration before a complete job; retain audio and script as job artifacts when quality checks fail. Never rely on an unpinned latest checkpoint or imply that a cache hit verifies model integrity. These are engineering recommendations, not commands tested here.

A CPU benchmark on the actual GitHub-hosted runner remains required before choosing Nano over Kokoro or setting timeout budgets. No runner job was executed during this research.

### Verified upstream API entry points

For Kokoro, the upstream example uses `KPipeline(lang_code="a")`, then `pipeline(text, voice="af_heart")` and yields `(graphemes, phonemes, audio)` chunks at 24 kHz. CPU can be selected explicitly rather than relying on accelerator auto-detection. Its documented dependencies include the `kokoro` Python package and eSpeak NG fallback. [Kokoro upstream](https://github.com/hexgrad/kokoro)

For Nano, the published entry point is `ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)` followed by `model.generate(text, audio_prompt_path=reference_path)` and saving at `model.sr`. The documentation recommends Python 3.11 and installs `chatterbox-tts`. Treat that as an API discovery result, not a verified release pin: confirm that the selected package release actually includes Nano before locking it, or pin an audited upstream commit. [Nano official usage](https://huggingface.co/ResembleAI/chatterbox-nano)

There is no tested package lock or model revision in this research note. Implementation must resolve and record exact immutable revisions; inventing a version number here would make the automation less repeatable.
