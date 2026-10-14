import path from "node:path";
import { mkdir, rename, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { assert, episode, VERSION, type Episode, type Source } from "./schema";
import { fileHash, probe, save } from "./io";
export async function ingest(
  input: string,
  identity: Episode,
  directory: string,
): Promise<Source> {
  episode(identity);
  await mkdir(directory, { recursive: true });
  let video = path.resolve(input);
  if (/^https?:\/\//.test(input)) {
    video = path.resolve(directory, "source.mp4");
    const temporary = `${video}.pending`;
    try {
      const response = await fetch(input, {
        signal: AbortSignal.timeout(600_000),
      });
      assert(
        response.ok && response.body,
        `Video download failed (${response.status})`,
      );
      let size = 0;
      const limit = Number(
        process.env.RECAP_MAX_DOWNLOAD_BYTES || 10_000_000_000,
      );
      assert(Number.isFinite(limit) && limit > 0, "Invalid download limit");
      await pipeline(
        Readable.fromWeb(response.body as any),
        new Transform({
          transform(chunk, _, cb) {
            size += chunk.length;
            cb(
              size > limit ? new Error("Video exceeds download limit") : null,
              chunk,
            );
          },
        }),
        createWriteStream(temporary),
      );
      await rename(temporary, video);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }
  const info = await probe(video);
  const duration = Number(info.format.duration);
  assert(
    info.streams.some((s: any) => s.codec_type === "video") &&
      Number.isFinite(duration) &&
      duration > 0 &&
      duration <= 14_400,
    "Source must be a video up to four hours",
  );
  const source: Source = {
    version: VERSION,
    episode: identity,
    sourceHash: await fileHash(video),
    video,
    duration,
  };
  await save(path.join(directory, "source.json"), source);
  await save(path.join(directory, "probe.json"), info);
  return source;
}
