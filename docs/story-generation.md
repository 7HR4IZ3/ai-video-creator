# Story generation and independent voice auditions

## What quality means here

An engaging short needs a specific conflict, understandable stakes, escalating consequences, and an honest payoff. The writer now proposes three openings, selects one, writes spoken beats with separate delivery directions, and performs a second source-based editorial pass. Generic bait, missing fields, spoken stage directions, and implausible word counts fail validation. An AI review is not proof of factual accuracy or viewer retention.

The original text, model, draft, review, final narration, and estimated duration are saved in `media/narrations`. Changing the source or editor/model invalidates the script cache. Audio caching also includes the script, selected voice model, reference audio hash, speaker, speed, seed, and model revision. Old audio without a matching manifest is regenerated.

The default story provider is OpenCode. No provider substitution happens automatically. The default local voice candidate is Qwen3-TTS 1.7B CustomVoice, selected for its direction controls, not a claimed listening-test win. CPU narration can be slow and memory hungry. Choose the final voice after auditioning outputs.

## GitHub Actions

Open **Actions → Story and voice auditions → Run workflow**. Select all voices or one candidate. The editor checkbox is independent of the voice selection.

Each voice runs as its own matrix job, with its own environment, dependencies, weights cache, and artifact. `fail-fast` is false and no jobs use `needs`. A failed editor or voice therefore does not block any other voice. Every voice reads `tests/story/fixtures/production.json` directly. It does not call Reddit, OpenCode, another voice, or an upload provider.

Artifacts are `voice-qwen3-custom`, `voice-chatterbox-nano`, `voice-chatterbox-turbo`, `voice-kokoro`, and `story-editor`. Voice artifacts contain the source production script, MP3, beat timings, runtime log, peak memory from `/usr/bin/time`, and ffprobe metadata. Error logs are retained when generation fails. No publishing occurs.

Qwen uses the Ryan preset and the supplied acting directions. Kokoro uses af_heart at normal speed. Chatterbox uses the checkpoint's bundled voice conditioning, so no private reference recording or secret is required. These are different voice identities, not a controlled same-speaker cloning test. Nano/Turbo do not implement arbitrary acting instructions, so their directions remain review metadata. Their upstream code supports optional reference audio with `TTS_REFERENCE_AUDIO`.

Kokoro's English spaCy model is installed from a pinned wheel during setup and verified before voice weights download. Synthesis fails with setup instructions if it is absent, rather than launching an implicit package installer. The obsolete root `pyvenv.cfg` was removed because it made uv mistake the checkout for a broken virtual environment.

Python packages are locked separately for Qwen, Kokoro, and Chatterbox. CPU PyTorch wheels avoid unnecessary CUDA downloads. Model checkpoints and Chatterbox source are pinned to the researched revisions. Changing a model revision should be followed by a fresh audition. The workflow targets ordinary Ubuntu CPU runners. Qwen's throughput and memory fit on hosted runners remain to be measured; its 120-minute job limit is a bound, not a runtime claim.

## Local commands

Write and review without generating audio:

```sh
bun run src/story/cli.ts --source tests/story/fixtures/source.json --seconds 60
```

Choose another supported OpenCode model explicitly:

```sh
bun run src/story/cli.ts --source tests/story/fixtures/source.json --model opencode/muse-spark-1.3-contributor-free
```

OpenCode 2.0.29 is the tested installed version. The adapter invokes the real CLI with JSONL output, supplies source through stdin, and uses an isolated directory with a text-only agent. It reports error events and timeouts. On 2026-10-14 the model appeared in the live catalog but an actual CLI call returned HTTP 403, "OpenCode's free tier can only be used from within OpenCode." This is unresolved access behavior, not successful inference. The independent editor CI job tests whether the hosted runner behaves differently. Do not forge client identity or silently replace the model. [Official CLI](https://dev.opencode.ai/v2/docs/cli/commands/), [model catalog](https://dev.opencode.ai/v2/docs/console/models/)

An explicit OpenRouter alternative remains available, requiring its own valid key and credits:

```sh
bun run src/story/cli.ts --source tests/story/fixtures/source.json --provider openrouter --model openai/gpt-4o-mini
```

A local check with the stored OpenRouter credential returned "Payment Required". That provider was not used to produce a successful sample.

On Ubuntu, create an isolated voice environment and install the chosen lockfile. Example for Qwen:

```sh
uv venv --python 3.11 .voice-venv
uv pip sync --python .voice-venv/bin/python --extra-index-url https://download.pytorch.org/whl/cpu requirements/story/qwen.txt
.voice-venv/bin/python utils/story_voice.py --production tests/story/fixtures/production.json --model qwen3-custom --output audition/qwen/narration.mp3
```

Install FFmpeg, libsndfile, SoX, and espeak-ng as the workflow does. These lockfiles target Linux/Python 3.11, not macOS. Set `TTS_PYTHON=.voice-venv/bin/python` when invoking `src/story/cli.ts --audio` or the existing story generator. Select `LOCAL_TTS_MODEL` from `qwen3-custom`, `chatterbox-nano`, `chatterbox-turbo`, or `kokoro`; set `TTS_SPEAKER` for Qwen and `TTS_VOICE` for Kokoro. The existing scheduled full-video workflow explicitly retains OpenRouter and Kokoro until auditions establish a replacement. Its older full-video environment is separate from these locked voice environments.

## How to judge the outputs

Listen without music, at the same playback volume. Check the opening, frustrated passage, realization, and final sentence. Prefer believable intention and rhythm over exaggerated emotion. Reject skipped words, repeats, clipped endings, and abrupt changes between beats. Then compare generation time and memory as operating costs.

The worker generates coherent beats, inserts bounded pauses, normalizes final audio, and records real durations. Basic silence, finite-sample, and duration checks catch severe failures. They do not verify every spoken word. Saved beat times are not word-level forced alignment, and the estimated script duration does not guarantee the final recording's length. Caption alignment and a listening-based selection are the next quality gates.

Research and source links are in [local-voice-research.md](local-voice-research.md). No model has been declared the winner before hearing the runner's actual outputs.
