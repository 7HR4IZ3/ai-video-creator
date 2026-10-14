import path from "node:path";
import { synthesizeStory } from "../story/voice";
import { fileHash, hash, json, probe, run, save } from "./io";
import { type Production, type AudioBeat } from "./schema";
export async function narrate(
  production: Production,
  directory: string,
  model = "chatterbox-turbo",
): Promise<AudioBeat[]> {
  // Load the voice once for the whole episode. Split the normalized master using generated beat boundaries.
  const input = {
    version: production.version,
    source: { name: production.episode.id },
    draft: {
      title: production.draft.title,
      beats: production.draft.beats.map((b) => ({
        role: "setup",
        text: b.text,
        direction: b.direction,
        pauseAfterMs: b.pauseAfterMs,
      })),
    },
    narration: production.draft.beats.map((b) => b.text).join("\n\n"),
  };
  const master = path.resolve(directory, "audio", "narration.mp3");
  const synthesis = await synthesizeStory(input, { output: master, model });
  const timings = await json(`${master}.timing.json`);
  const fingerprint = hash({
    production: production.fingerprint,
    voice: synthesis.fingerprint,
    timings,
  });
  try {
    const cached = await json(path.join(directory, "audio.json"));
    if (
      cached.fingerprint === fingerprint &&
      cached.beats.length === production.draft.beats.length &&
      (
        await Promise.all(
          cached.beats.map(
            async (b: AudioBeat, index: number) =>
              (await fileHash(b.file)) === cached.hashes[index],
          ),
        )
      ).every(Boolean)
    )
      return cached.beats;
  } catch {}
  const beats: AudioBeat[] = [];
  for (let index = 0; index < production.draft.beats.length; index++) {
    const b = production.draft.beats[index]!,
      timing = timings.beats[index],
      next = timings.beats[index + 1];
    const duration = (next?.start ?? timing.end) - timing.start;
    const file = path.resolve(directory, "audio", `${b.id}.wav`);
    await run(process.env.FFMPEG_BIN || "ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(timing.start),
      "-i",
      master,
      "-t",
      String(duration),
      "-ar",
      "48000",
      "-ac",
      "2",
      file,
    ]);
    const info = await probe(file);
    beats.push({
      id: b.id,
      file,
      duration: Number(info.format.duration),
      text: b.text,
    });
  }
  await save(path.join(directory, "audio.json"), {
    fingerprint,
    beats,
    hashes: await Promise.all(beats.map((b) => fileHash(b.file))),
  });
  return beats;
}
