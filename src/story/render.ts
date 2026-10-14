import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RedditStory, StreamSrc } from "../types";
import { readAsReadable } from "../utils";

export async function renderStoryVideo(story: RedditStory, audio: StreamSrc, background: StreamSrc): Promise<StreamSrc> {
  const productionPath = path.resolve("media/narrations", `${story.name}.json`);
  const production = JSON.parse(await readFile(productionPath, "utf8"));
  if (!production.review?.approved || typeof production.narration !== "string") throw new Error("Rendering requires reviewed narration.");
  const output = path.resolve("media/outputs", `${story.name}.mp4`);
  const backgroundInfo = await stat(background.src);
  const audioHash = createHash("sha256").update(await readFile(audio.src)).digest("hex");
  const signature = createHash("sha256").update(JSON.stringify({
    version: "story-render-v1", narration: production.narration, title: production.draft.title, audioHash,
    background: path.resolve(background.src), size: backgroundInfo.size, modified: backgroundInfo.mtimeMs,
  })).digest("hex");
  await mkdir(path.dirname(output), { recursive: true });
  try {
    const manifest = JSON.parse(await readFile(`${output}.manifest.json`, "utf8"));
    if (manifest.signature === signature && (await stat(output)).size > 0) return readAsReadable({ filePath: output });
  } catch {}
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(process.env.RENDER_PYTHON || process.env.TTS_PYTHON || "python3", [
      path.resolve(import.meta.dir, "../../utils/story_render.py"), "--production", productionPath,
      "--audio", path.resolve(audio.src), "--background", path.resolve(background.src), "--output", output,
      "--alignment", output.replace(/\.mp4$/, ".alignment.json"),
    ], { stdio: "inherit" });
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("Video rendering exceeded thirty minutes.")); }, 1_800_000);
    proc.on("error", error => { clearTimeout(timer); reject(error); });
    proc.on("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Video rendering failed with code ${code}.`)); });
  });
  if ((await stat(output)).size === 0) throw new Error("Renderer produced an empty video.");
  await writeFile(`${output}.manifest.json`, JSON.stringify({ signature, audioHash, background: background.src, generatedAt: new Date().toISOString() }, null, 2));
  return readAsReadable({ filePath: output });
}
