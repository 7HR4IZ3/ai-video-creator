import path from "node:path";
import { mkdir } from "node:fs/promises";
import {
  assert,
  safeId,
  type Production,
  type Source,
  type Timeline,
} from "./schema";
import { probe, run } from "./io";
export interface Insert {
  id: string;
  afterBeatId: string;
  evidenceId: string;
  start: number;
  end: number;
  transcript: string;
  purpose: string;
}
export async function addInserts(
  timeline: Timeline,
  source: Source,
  production: Production,
  inserts: Insert[],
  directory: string,
): Promise<Timeline> {
  assert(
    Array.isArray(inserts) && inserts.length <= 5,
    "At most five explicit original-audio inserts",
  );
  const ids = new Set(timeline.beats.map((b) => b.id));
  const result: Timeline = { ...timeline, beats: [], segments: [] };
  let cursor = 0;
  await mkdir(path.join(directory, "inserts"), { recursive: true });
  for (const beat of timeline.beats) {
    const base = timeline.segments.filter((s) => s.beatId === beat.id);
    const shift = cursor - base[0]!.outputStart;
    result.beats.push(beat);
    result.segments.push(
      ...base.map((s) => ({
        ...s,
        outputStart: s.outputStart + shift,
        outputEnd: s.outputEnd + shift,
      })),
    );
    cursor += beat.duration;
    for (const insert of inserts.filter((i) => i.afterBeatId === beat.id)) {
      assert(
        safeId(insert.id) && !ids.has(insert.id),
        "Duplicate or invalid insert ID",
      );
      ids.add(insert.id);
      const evidence = production.analysis.evidence.find(
        (e) => e.id === insert.evidenceId,
      );
      assert(
        evidence &&
          Number.isFinite(insert.start) &&
          Number.isFinite(insert.end) &&
          insert.start >= evidence.start &&
          insert.end <= evidence.end &&
          insert.end > insert.start &&
          insert.end - insert.start <= 12,
        "Insert must be at most twelve seconds within its cited evidence",
      );
      assert(
        typeof insert.transcript === "string" &&
          insert.transcript.trim() &&
          typeof insert.purpose === "string" &&
          insert.purpose.trim(),
        "Insert needs verified dialogue transcript and editorial purpose",
      );
      const current = production.draft.beats.find((b) => b.id === beat.id)!;
      assert(
        current.evidenceIds.includes(insert.evidenceId),
        "Insert must support the preceding beat, without an early reveal",
      );
      const file = path.resolve(directory, "inserts", `${insert.id}.wav`),
        duration = insert.end - insert.start;
      await run(process.env.FFMPEG_BIN || "ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        String(insert.start),
        "-i",
        source.video,
        "-t",
        String(duration),
        "-vn",
        "-af",
        `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.04,afade=t=out:st=${Math.max(0, duration - 0.06)}:d=0.06`,
        "-ar",
        "48000",
        "-ac",
        "2",
        file,
      ]);
      const actual = Number((await probe(file)).format.duration);
      assert(
        Math.abs(actual - duration) < 0.05,
        "Original audio extraction duration mismatch",
      );
      result.beats.push({
        id: insert.id,
        file,
        duration,
        text: insert.transcript,
      });
      result.segments.push({
        beatId: insert.id,
        evidenceId: insert.evidenceId,
        outputStart: cursor,
        outputEnd: cursor + duration,
        sourceStart: insert.start,
        sourceEnd: insert.end,
      });
      cursor += duration;
    }
  }
  assert(
    inserts.every((i) => timeline.beats.some((b) => b.id === i.afterBeatId)),
    "Insert refers to unknown narration beat",
  );
  result.duration = cursor;
  return result;
}
