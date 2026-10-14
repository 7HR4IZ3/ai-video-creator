import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";

import { readAsReadable } from "./utils";
import { AUDIO_DIR, CWD } from "./constants";
import { getElevenLabs, getOpenAI, getZyphra } from "./ai";
import { editStory } from "./story/editor";
import { synthesizeStory } from "./story/voice";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { RedditStory, StreamSrc } from "./types";

async function generateAudioElevenLabs(story: RedditStory, narration: string) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const audio = await getElevenLabs().textToSpeech.convert("cjVigY5qzO86Huf0OWal", {
    text: narration,
  });

  const stream = fs.createWriteStream(AUDIO_SRC);
  await pipeline(audio, stream);
  return readAsReadable({ filePath: AUDIO_SRC });
}

async function generateAudioOpenaAI(story: RedditStory, narration: string) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const mp3 = await getOpenAI().audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: narration,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(AUDIO_SRC, buffer);

  return { src: AUDIO_SRC, stream: Readable.from(buffer) };
}

async function generateAudioZyphra(story: RedditStory, narration: string) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const blob = await getZyphra().audio.speech.create({
    text: narration,
    speaking_rate: 15,
    speaker_audio: await fs.promises.readFile(
      path.join(AUDIO_DIR, "eleven.wav"),
      "base64",
    ),
    mime_type: "audio/mp3",
  });
  const buffer = Buffer.from(await blob.arrayBuffer());

  await fs.promises.writeFile(AUDIO_SRC, buffer);
  return { src: AUDIO_SRC, stream: Readable.from(buffer) };
}

function generateAudioLocal(story: RedditStory, narration: string, useDia?: boolean) {
  return new Promise<StreamSrc>(async (resolve, reject) => {
    const outputPath = path.join(CWD, "media/audios", `${story.name}.mp3`);
    const text = narration;

    const scriptArgs = [
      path.join(CWD, "utils/main.py"),
      "audio",
      "-o",
      outputPath,
      "--voice",
      "af_sarah",
      "--speed",
      "0.9",
      "--pitch",
      "1.0",
      "--emotion",
      "neutral"
    ];

    if (useDia) {
      scriptArgs.push("--use-dia");
    }
    scriptArgs.push(text);

    const proc = spawn("python3", scriptArgs, {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    proc.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    proc.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    proc.on("error", reject);
    proc.on("exit", async (code) => {
      if (code !== 0) { reject(new Error(`Local Dia exited with code ${code}`)); return; }
      try {
        resolve(await readAsReadable({ filePath: outputPath }));
      } catch {
        reject(new Error("Failed to generate audio"));
      }
    });
  });
}

export async function generateAudio(story: RedditStory, useDia?: boolean, options: { targetSeconds?: number; voiceModel?: string } = {}) {
  await fs.promises.mkdir(AUDIO_DIR, { recursive: true });
  const production = await editStory(story, { targetSeconds: options.targetSeconds });
  const generator = process.env.AUDIO_GENERATOR || "local";
  if (generator === "local" && !useDia) {
    const result = await synthesizeStory(production, { model: options.voiceModel });
    return readAsReadable({ filePath: result.output });
  }
  const outputPath = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const fingerprint = createHash("sha256").update(JSON.stringify({ version: "narration-v1", narration: production.narration, generator, useDia })).digest("hex");
  try {
    const manifest = JSON.parse(await fs.promises.readFile(`${outputPath}.manifest.json`, "utf8"));
    if (manifest.fingerprint === fingerprint && (await fs.promises.stat(outputPath)).size > 0) return readAsReadable({ filePath: outputPath });
  } catch {}
  let audio: StreamSrc;
  if (generator === "elevenlabs") audio = await generateAudioElevenLabs(story, production.narration);
  else if (generator === "openai") audio = await generateAudioOpenaAI(story, production.narration);
  else if (generator === "zyphra") audio = await generateAudioZyphra(story, production.narration);
  else if (generator === "local") audio = await generateAudioLocal(story, production.narration, useDia);
  else throw new Error(`Unsupported audio generator: ${generator}`);
  await fs.promises.writeFile(`${outputPath}.manifest.json`, JSON.stringify({ fingerprint, generator }));
  return audio;
}
