import { readAsReadable } from "../utils";
import { VIDEO_DIR } from "../constants";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function grabGameplayVideo(file?: string) {
  await import("node:fs/promises").then(fs => fs.mkdir(VIDEO_DIR, { recursive: true }));
  const video = file ? path.resolve(file) : path.join(VIDEO_DIR, (await readdir(VIDEO_DIR)).filter(name => /\.(mp4|mov|mkv)$/i.test(name)).sort()[0] || "");
  if (!(await stat(video)).isFile()) throw new Error("No background footage found. Supply --background <video> or add footage under media/videos.");
  return readAsReadable({ filePath: video });
}
