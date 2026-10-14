# Episode recaps

The recap path analyzes the exact input video, writes from timestamped evidence using native OpenCode, narrates with Chatterbox Turbo, selects relevant episode footage, and renders a 16:9 video with forced-aligned phrase captions. Original episode sound is muted unless an explicit dialogue insert is requested. Nothing is uploaded to a social platform.

## Run

Use the existing pinned Python 3.11 voice and render environments described in [story-generation.md](story-generation.md). Set TTS_PYTHON and RENDER_PYTHON to their interpreters. FFmpeg needs libass; macOS can use ffmpeg-full through FFMPEG_BIN. Install the native OpenCode CLI. The configured default writing model is opencode/muse-spark-1.3-contributor-free; OPENCODE_RECAP_MODEL overrides it. Set GOOGLE_API_KEY for automatic episode analysis. RECAP_VIDEO_MODEL defaults to gemini-2.5-flash and is configurable.

Create episode.json:

```json
{"showId":"my-show","id":"s01e01","order":1,"continuity":"main","title":"Episode title"}
```

The explicit order follows audience reveal order, including specials. Use a separate continuity for alternate versions. The first implementation processes English audio and narration.

```sh
bun run src/index.ts generate-recap \
  --movie /path/to/episode.mp4 --episode episode.json \
  --work-dir media/recaps/my-show/s01e01 --seconds 300 \
  --memory data/shows/my-show/memory.json
```

A direct HTTP video URL also works. Downloads are limited to 10 GB and ten minutes by default; RECAP_MAX_DOWNLOAD_BYTES changes the size limit. Sources are fingerprinted by a streaming SHA-256 hash. The previous title-only generate-recap interface has been replaced: --episode and --work-dir are required, and --title/--max-clips/upload flags no longer apply.

Automatic analysis extracts supplied/embedded SRT subtitles or a CPU transcript, detects candidate visual cuts, and sends overlapping three-minute proxies to Gemini. It preserves observations, dialogue claims, and inferred interpretations separately. Model observations and subtitle synchronization still require review. It does not browse show wikis or silently fill gaps from model recollection.

For manually corrected evidence, pass --evidence analysis.json. The schema is defined in src/recap/schema.ts; the file must match the source hash, episode identity, and duration. Use the saved analysis.json as the starting point. --subtitles accepts matching SRT. --draft accepts an edited narration draft, which still undergoes independent OpenCode review.

## Stages and outputs

```sh
bun run src/recap/cli.ts ingest --video episode.mp4 --episode episode.json --work-dir media/recaps/demo
bun run src/recap/cli.ts analyze --work-dir media/recaps/demo
bun run src/recap/cli.ts plan --work-dir media/recaps/demo --seconds 300 --memory data/shows/my-show/memory.json
bun run src/recap/cli.ts narrate --work-dir media/recaps/demo --memory data/shows/my-show/memory.json
bun run src/recap/cli.ts render --work-dir media/recaps/demo --memory data/shows/my-show/memory.json
```

Use the same memory input on subsequent stages. A changed source, evidence packet, or retrieved context requires planning again. Voice generation loads the selected model once, saves a normalized master and timing report, then splits measured beat audio. Render caches include timeline and audio hashes. Analysis chunks can resume independently. A changed narration regenerates its voice master; per-beat synthesis reuse is not implemented yet.

The working directory contains source/probe metadata, transcript and cut index, chunk analysis, validated evidence, the retrieved context packet, draft/review/production, candidate memory update, voice master and beat files, timeline, alignment, captions, and recap.mp4. A runtime deviation over 20% is reported. If evidence provides insufficient distinct footage, timeline planning fails with the affected beat instead of looping or stretching it. Shorten that beat with --draft or expand verified evidence and plan again.

The current scene selector uses explicit evidence ranges in source order. It does not yet rank facial expressions, automatically track crops, or perform semantic duplicate detection. Cross-chunk dependencies and ambiguous character identities should be corrected in evidence before final production. Exact duplicate event descriptions are merged; broader reconciliation remains a review task.

## Show memory

A memory bundle stores immutable, evidence-referenced facts with show, continuity, source episode, first audience reveal order, epistemic status, and revision hash. Retrieval selects relevant entities only after excluding the current and all future episodes. A future correction cannot erase an older fact from an earlier snapshot. Corrections use supersedes references; claims remain claims. Entity names/aliases in a record must themselves be valid at that record's reveal boundary.

Each plan writes memory-delta.json with high-confidence observed/claimed evidence as candidates. Inspect and correct episode analysis before accepting candidates. The recap's prose never becomes its own evidence.

```sh
bun run src/recap/cli.ts commit-memory \
  --work-dir media/recaps/my-show/s01e01 \
  --memory data/shows/my-show/memory.json
```

Commit checks the unchanged parent revision and takes a local filesystem lock. If another episode committed first, rerun plan with the latest memory, then inspect the new delta. Keep episode IDs and ordering stable. A missing memory file starts an empty show; the program does not invent earlier context. Use a real shared filesystem or a single writer for commits. This lock is not a distributed object-store transaction.

GitHub caches are not memory persistence. CI exports candidate-memory.json and memory-delta.json as artifacts for review. Manual runs can read an approved bundle using memory_url and its required memory_sha256; the hash pins the exact input revision. Copy approved bundles to a durable destination before future runs. Automatic cloud persistence, SQLite/embedding retrieval, structured relationship/thread editing, and external-reference ingestion are planned extensions, not active behavior. Existing bundles may be provided locally; do not paste unscoped future plot summaries into them.

## Original-dialogue inserts

Pass --inserts inserts.json on the full command or render stage. At most five inserts are accepted, each at most twelve seconds and within evidence already selected for the preceding beat:

```json
[{"id":"line1","afterBeatId":"b2","evidenceId":"e7","start":123.4,"end":127.2,"transcript":"Verified exact dialogue.","purpose":"Let the character deliver the reveal."}]
```

Narration pauses while the extracted source line plays. Caption alignment uses the supplied transcript and extracted audio. Verify the transcript yourself; forced alignment does not prove the words were spoken. Silent sound-effect inserts without dialogue are not supported yet. Inserts must be supplied again when rebuilding the timeline.

## Verification and CI

```sh
bun test tests/recap tests/story
python3 -m unittest discover -s tests/recap -p '*_test.py'
RENDER_PYTHON=/path/to/render/python bun run tests/recap/fixture.ts media/recap-fixture --render
```

The synthetic fixture uses generated shapes, known evidence, and espeak-ng on Linux or macOS say. It verifies actual caption rendering, source selection, and an isolated original-dialogue insert without AI credentials or a voice-model download. The alignment model is still required. Its synthetic production is explicitly labelled as a verified fixture, not an AI editorial approval.

The Episode recap pipeline workflow runs offline checks and the media smoke independently. Manual fixture mode also exercises the real application CLI, OpenCode writing/review, and Turbo. Manual episode mode accepts a direct video URL and episode metadata JSON, with GOOGLE_API_KEY or the existing ENV_FILE secret configured. No durable memory is automatically written or published by CI.

The broader implementation roadmap remains in [plans/episode-recap-pipeline.md](plans/episode-recap-pipeline.md). A successful synthetic run proves media plumbing, not the quality of a complete television recap. Review a real supplied episode before unattended production.
