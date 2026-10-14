# Episode recap pipeline and show memory

Status: initial implementation is in src/recap. See docs/episode-recaps.md for current usage, verified behavior, and limitations. The milestones below remain the broader quality roadmap.

## Product contract

Input: an exact episode video, show and episode identifiers, ordering metadata, optional matching subtitles, target duration, and output format.

Output: one narrated recap whose footage supports the spoken story, plus evidence, an editable timeline, and a proposed show-memory update. Default target is 4–6 minutes, 16:9, Turbo narration, phrase captions, original audio muted except for explicit inserts. An episode's actual complexity determines whether the target is achievable without losing coherence. Warn and propose a duration change rather than silently omit essential causes or truncate the ending.

The recap should explain the central conflict, character goals, choices, consequences, major turns, and resolution or actual episode cliffhanger. It should not require watching earlier recaps. Supply only the prior context necessary to understand this episode. Preserve uncertainty and intentional mysteries.

## Design rules

- Analyze the supplied copy. Never invent timestamps from a title or remembered plot.
- Every factual narration claim points to episode evidence or an eligible show-memory fact.
- Store what the audience knows separately from what characters know and from inferred explanations.
- Keep source-video time, story chronology, and output-video time distinct.
- Future knowledge must be filtered before the writer receives context. A prompt alone is insufficient protection.
- Generate audio before final clip durations. Reuse the existing voice and caption components through shared interfaces.
- Save inspectable stage outputs and resume only stages whose inputs changed.
- Report uncertain identities and conflicting evidence rather than converting them into canon.

## 1. Identity, ordering, and ingestion

Use stable show, season, episode, and source-asset IDs. Record title aliases, language, edition, content hash, duration, frame rate, resolution, audio/subtitle tracks, and subtitle offsets. Episode numbers alone are not a reliable order: specials, alternate air dates, and split episodes require an explicit ordered episode list and named continuity.

For the first version, accept a local file or direct HTTP URL. Download atomically with size/time limits, probe the result, and preserve the original. Extract a low-resolution analysis proxy and mono analysis audio. Keep original-resolution footage for rendering. Detect or mark credits, opening titles, and previously-on sections so they are not mistaken for current events. Previously-on footage may supply context, but needs its own provenance and must not become a new event in this episode.

Artifacts: source.json, probe.json, proxy.mp4, analysis.wav, subtitle-tracks.json.

## 2. Timestamped evidence index

Prefer correctly matched embedded or supplied subtitles; otherwise transcribe. Validate language, timing bounds, and alignment against the actual audio. Subtitles are dialogue evidence, not proof of off-screen actions. Preserve speaker uncertainty.

Detect shot boundaries, extract representative frames, and group related shots into semantic scenes using dialogue and visual evidence. A shot cut is not automatically a new story scene. Analyze overlapping chunks, convert chunk-local timestamps to source timestamps, deduplicate overlap, and reconcile scene boundaries. Inspect important or uncertain moments again at finer temporal resolution.

Each evidence record contains an ID, source asset, source range, modality, observation, confidence, and analyzer/version. Store direct observations separately from interpretations. Identify visible text, silent actions, reactions, entrances/exits, and reveals that dialogue alone would miss. Use stable character IDs and provisional labels until identity is supported.

Artifacts: transcript.json, shots.json, scenes.json, observations.json, character-candidates.json, representative frames.

## 3. Show memory

### Storage and authority

Start with versioned JSON records plus a generated SQLite search index. JSON is the authoritative portable data; SQLite is rebuildable. Use structured queries and full-text search first. Add embeddings only when retrieval measurements justify them. Do not put an entire growing show bible in every prompt.

Suggested layout:

    data/shows/<show-id>/show.json
    data/shows/<show-id>/episodes/<episode-id>/facts.json
    data/shows/<show-id>/episodes/<episode-id>/events.json
    data/shows/<show-id>/episodes/<episode-id>/memory-delta.json
    data/shows/<show-id>/snapshots/<episode-id>.json
    data/shows/<show-id>/overrides.json

Generated full-video assets belong in media storage, not the memory repository. Canonical records retain compact evidence references and hashes.

### What to remember

- Characters: stable ID, names and aliases with reveal boundaries, confirmed relationships, goals, status changes, and identity uncertainty.
- Events: participants, action, consequences, source ranges, episode reveal order, and any known in-world chronology.
- Relationships: directional trust, rivalry, allegiance, family links, and the events that changed them.
- Plot threads: opening event, unresolved question, developments, and resolution evidence.
- World rules and important objects: demonstrated constraints, ownership changes, and exceptions.
- Episode summaries: compact factual synopsis, major developments, and newly established facts.
- Editorial corrections: explicit human changes with reason, author, and source references.

Do not store every line of dialogue as durable context. The transcript already exists. Memory retains facts useful across episodes and the evidence needed to inspect them.

### Fact record

A fact needs ID, subject/predicate/object or structured payload, source evidence IDs, source episode, first audience reveal, last supporting observation, status, confidence, continuity ID, and revision history. Distinguish observed, character-claimed, inferred, disputed, and corrected statements. Confidence does not promote an inference to an observation.

A character claim such as "Mara says her brother died" remains a claim until supported. A later reveal that he survived appends a correction or superseding relationship. It must not rewrite what the audience knew in earlier episodes. State changes such as ownership or allegiance also append transitions rather than overwrite history.

### Spoiler boundaries

Build a deterministic memory snapshot for the requested episode and continuity. The writer receives eligible facts only. Earlier recaps must never retrieve later identity aliases, outcomes, summaries, or metadata that disclose future reveals.

Use two contexts: pre-episode memory for setup, and within-episode knowledge for the recap progression. Inside the episode, facts become available according to audience reveal order, not fictional chronology. Flashbacks may describe older events revealed much later. An optional opening hook may tease the current episode's conflict, but cannot casually explain a later twist before the story reaches it.

Track character knowledge separately when material to the plot. "The audience sees the planted key" and "the detective knows who planted it" are different facts.

### Retrieval

Retrieve a bounded context packet using confirmed characters, active threads, named objects, and relationships found in the current episode. Include supporting facts and short context explanations. Log which records were selected and why. Exclude unrelated history. If this is the first processed episode and earlier context is unavailable, state the gap; do not fill it from model recollection.

### External context

Support optional user notes and imported show references as a separate provenance layer. Record origin, retrieval date, licensing/source metadata where available, episode scope, and review state. External plot pages can contain whole-show spoilers, so they must not enter the recap prompt until facts have explicit reveal boundaries. Prefer supplied episodes as evidence. External claims that conflict with the footage remain disputed until resolved.

### Commit and persistence

Episode analysis produces a proposed memory delta. Validate its schema, evidence references, order, duplicates, and contradictions before committing. Initial runs expose the delta for inspection; a later automation mode may commit validated high-confidence observations, retaining all decisions in an audit log. A script's prose never becomes its own factual evidence.

On GitHub Actions, caches only accelerate dependencies and models. They are not durable show memory. Use a separately configured durable store with versioned manifests and conditional writes, or an explicit reviewed repository commit workflow. First implementation can read a pinned memory bundle and publish a candidate bundle as an artifact. Serialize commits per show, check the parent memory revision, and reject stale concurrent updates. Out-of-order episode ingestion is allowed, but snapshots are rebuilt deterministically from eligible records.

## 4. Episode story model

Create an episode outline from evidence and retrieved context before writing prose. Represent events and causal links: what the character wants, what changes, what choice follows, and its consequence. Mark must-cover events, optional subplots, uncertainty, reveals, and resolved/unresolved threads.

Select essential prior context explicitly. Establish a coverage budget based on target length. Drop minor subplots deliberately and record omissions; preserve the causes needed for included outcomes. Maintain reveal order unless an explicit editorial choice explains the change.

Artifacts: context-packet.json, episode-outline.json, coverage-plan.json.

## 5. OpenCode writing and editorial review

Use native OpenCode with the configured Muse model for structured outlining, writing, and review. A separate video-analysis adapter supplies the observations; do not assume the text-writing model can inspect video.

Write narration in beats with stable IDs, delivery direction, pause, event references, factual claim references, desired visual evidence, and estimated duration. Use concrete actions and consequences. Avoid generic suspense filler, invented dialogue, unsupported motives, repetitive names, and forced cliffhangers. Current-episode footage supplies a visual vocabulary for the writer.

Review against the evidence packet, not only another copy of the draft. Check character identity, chronology, causal gaps, episode coverage, unsupported assertions, and spoilers. Permit bounded repairs. Validation failure produces diagnostics and preserves the previous approved production.

Artifacts: outline-response.txt, draft.json, review.json, approved-production.json, narration.txt.

## 6. Narration and clip planning

Reuse Turbo, per-beat generation, profile fingerprints, pauses, loudness normalization, and validation. Store actual beat boundaries and align approved narration text to the finished audio. Generate only changed beats when the voice interface supports safe reuse; key every beat by text, direction, model, profile, seed, and reference voice.

Build an edit decision list using measured audio duration. Each output segment records output in/out, source asset and in/out, beat ID, evidence IDs, crop/layout, playback speed, transition, and audio mode. One beat can use several shots. A fact can be narrated slightly before its illustrative shot when coherent, but the key action must appear during the relevant passage.

Rank candidate footage by evidence match, visible action, readable composition, continuity, and redundancy. Avoid showing future reveals early, unrelated reactions, excessive repeats, clipped actions, frozen frames, and arbitrary speed changes. When a beat lacks enough suitable footage, revise its narration or select additional evidence-supported shots. Never silently loop a short action. Use source-native movement and cuts as the first choice.

Prior-context narration may show current establishing footage or explicitly labelled earlier-episode footage when those assets exist. Do not imply that an old event happened in the current episode.

Artifacts: narration audio/timings, alignment.json, timeline.json, clip-selection-report.json, preview contact sheet.

## 7. Original audio and captions

Original episode audio is muted by default. An explicit insert can carry a crucial line, reveal, or sound that works better directly. Each insert needs exact source range, purpose, transcript if spoken, level, and its own place on the output timeline. Pause narration around dialogue rather than competing with it. Add short fades, avoid abrupt room-tone jumps, and account for insert duration in the total budget.

Narration captions use forced-aligned approved text. Insert captions use verified source dialogue and source timing remapped to output time. Validate both against the final mixed timeline. Do not show narration captions while a character says something different. Music is optional and disabled in the first milestone.

## 8. Rendering and validation

Extract reusable caption, alignment, audio, and output-validation helpers from the story worker. Keep a dedicated episode timeline renderer; a looping background and a narrative sequence have different input contracts. Render 16:9 first using original source resolution up to the configured output size. Add deliberate per-shot 9:16 framing later.

Validate source ranges, output coverage, no unintended gaps/overlaps, caption bounds, missing assets, finite timestamps, audio clipping/silence, expected dimensions, and final duration. Detect source audio leaking into muted segments. Emit a low-resolution review render before the final encode when requested. Render atomically and retain timeline/version fingerprints.

Automated checks cannot establish that the story is engaging or that a visual interpretation is true. The first complete episode needs listening and viewing review, with corrections saved as repeatable fixtures where practical.

## 9. Module boundaries

Proposed modules:

- src/recap/cli.ts: stage commands, inputs, resume and diagnostics.
- src/recap/ingest.ts: source identity, probing, proxy preparation.
- src/recap/analyze.ts: transcript/visual evidence orchestration and adapters.
- src/recap/memory/: records, snapshots, retrieval, deltas, persistence.
- src/recap/outline.ts and editor.ts: evidence-backed planning and OpenCode writing.
- src/recap/timeline.ts: measured-audio clip selection and edit decisions.
- src/recap/render.ts: renderer orchestration and output manifests.
- utils/recap_analyze.py and recap_render.py: local media workers.
- src/story/voice.ts and shared media helpers: reused narration/alignment/caption behavior.

Retire the title-based scene guessing in src/sources/movie.ts after the new path passes a full episode. Preserve compatibility through a thin adapter only if callers need it. Do not couple the work to unrelated football or Remotion changes.

## 10. CI and resumability

Expose ingest, analyze, plan, narrate, render, and all as stage commands. Each stage saves a schema-versioned manifest containing input hashes, configuration, model versions, parent artifact IDs, and output hashes. Changed memory invalidates context and writing, not original-media analysis. Changed voice invalidates audio, alignment, timeline fitting, and rendering. Changed caption style invalidates rendering only.

CI layers:

1. Offline fixtures: evidence validation, timestamp conversion, memory ordering, retrieval, causal coverage, timeline fitting, caption remapping. No credentials or model downloads.
2. Media smoke: short synthetic video with known cuts, dialogue, and audio inserts. Verify the actual encode and mix.
3. OpenCode integration: a fixed evidence packet produces a reviewed script without requiring visual analysis.
4. Manual full episode: supplied source URL and durable-memory revision; stage artifacts and actual final output. No upload/publishing side effects.

Use isolated dependency environments and fail-fast false for independent model auditions. A production episode's downstream stages correctly depend on its validated upstream outputs. Never reuse cached outputs from a different episode edition.

## 11. Delivery sequence and acceptance

### Milestone 1: prove evidence and editing on one short source

Implement schemas, local-file ingestion, subtitle/transcript import, shot index, and an editable evidence fixture. Build outline, narration, timeline, and render from that fixture. This isolates editing quality from visual-model quality. Accept when every spoken claim has evidence, every beat has relevant footage, captions align, and original audio obeys the timeline.

### Milestone 2: automate episode understanding

Add the video-analysis adapter, chunk reconciliation, character resolution, and evidence review. Run on one real episode. Inspect silent plot points, mistaken identities, timestamp accuracy, and omitted causes. Record failures and corrections. Accept when the generated event outline supports a coherent recap without guessed scenes.

### Milestone 3: add show continuity

Implement versioned memory, pre-episode snapshots, bounded retrieval, candidate deltas, contradiction handling, and durable persistence. Validate on at least three sequential episodes. Re-run the first after ingesting the last and confirm future facts do not enter its context or script. Test flashbacks, aliases, false claims, and out-of-order ingestion.

### Milestone 4: polish pacing and audio

Tune shot choice using actual Turbo output, selective original-audio inserts, duration repair, and review previews. Listen and watch the complete recap. Accept based on coherent story, supported narration, footage relevance, intelligible mix, and absence of distracting repeats. Save human observations separately from automated scores.

### Milestone 5: CI production path

Run the full application command on a CPU GitHub runner, persist artifacts and candidate memory updates, and demonstrate resume after a failed stage. Measure analysis cost, wall time, memory, storage, and final duration. Configure model/service choices from measured quality rather than assume the whole analysis stack fits a hosted CPU runner locally.

## Decisions to confirm before implementation

Provisional defaults: 4–6 minute episode recap, 16:9, current-episode spoilers allowed, future-episode spoilers forbidden, Turbo voice, muted episode audio with explicit inserts, local/direct-URL input, optional external references disabled until scoped.

The first validation source should be a specific episode the user can supply, with matching subtitles if available. Decide whether recaps primarily serve new viewers or viewers refreshing their memory; the first version assumes new viewers and explains essential prior context briefly. Choose the video-analysis service after a small evidence-extraction comparison. Establish the durable-memory destination before enabling unattended cross-episode runs.
