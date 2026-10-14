import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
/** Minimal shared contract used by story and episode narration. */
export interface VoiceProduction {
  version?: string;
  source: { name: string };
  draft: { title: string; beats: Array<{ role: string; text: string; direction: string; pauseAfterMs: number; cue?: string }> };
  narration?: string;
}

export async function synthesizeStory(production: VoiceProduction, options: { output?: string; model?: string } = {}) {
  const model = options.model || process.env.LOCAL_TTS_MODEL || "chatterbox-turbo";
  if (!["qwen3-custom", "kokoro", "chatterbox-nano", "chatterbox-turbo"].includes(model)) throw new Error("LOCAL_TTS_MODEL must be qwen3-custom, kokoro, chatterbox-nano, or chatterbox-turbo.");
  const output = path.resolve(options.output || `media/audios/${production.source.name}.mp3`);
  const reference = process.env.TTS_REFERENCE_AUDIO;
  const referenceHash = reference ? createHash("sha256").update(await readFile(reference)).digest("hex") : undefined;
  const profiles = JSON.parse(await readFile(path.resolve(import.meta.dir, "../../config/voice-profiles.json"), "utf8"));
  const fingerprint = createHash("sha256").update(JSON.stringify({
    version: "story-voice-v2", profile: profiles[model], draft: production.draft, model, referenceHash,
    revision: process.env.TTS_MODEL_REVISION || profiles[model].revision,
    voice: process.env.TTS_VOICE || profiles[model].voice, speaker: process.env.TTS_SPEAKER || profiles[model].speaker, speed: process.env.TTS_SPEED || String(profiles[model].speed),
    seed: process.env.TTS_SEED || "42",
  })).digest("hex");
  try {
    const manifest = JSON.parse(await readFile(`${output}.manifest.json`, "utf8"));
    if (manifest.fingerprint === fingerprint && (await stat(output)).size > 0) return { output, fingerprint, cached: true };
  } catch {}
  await mkdir(path.dirname(output), { recursive: true });
  const input = `${output}.production.json`;
  await writeFile(input, JSON.stringify(production, null, 2));
  const temporary = output.replace(/\.mp3$/, "") + ".pending.mp3";
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(process.env.TTS_PYTHON || "python3", [
      path.resolve(import.meta.dir, "../../utils/story_voice.py"), "--production", input,
      "--output", temporary, "--model", model,
    ], { stdio: "inherit" });
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("Local narration exceeded ninety minutes.")); }, 5_400_000);
    proc.on("error", error => { clearTimeout(timer); reject(error); });
    proc.on("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Local narration failed with exit code ${code}.`)); });
  });
  if ((await stat(temporary)).size === 0) throw new Error("Local narrator produced empty audio.");
  await rename(temporary, output);
  await rename(`${temporary}.timing.json`, `${output}.timing.json`);
  await writeFile(`${output}.manifest.json`, JSON.stringify({ fingerprint, model, referenceHash, generatedAt: new Date().toISOString() }, null, 2));
  return { output, fingerprint, cached: false };
}
