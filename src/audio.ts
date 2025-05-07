import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { exec, spawn } from "node:child_process";

import { readAsReadable } from "./utils";
import { AUDIO_DIR, CWD } from "./constants";
import { elevenlabs, openai, zyphra } from "./ai";

import type { RedditStory, StreamSrc } from "./types";

async function processText(title: string, story: string) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL!,
    messages: [
      {
        role: "system",
        content: `
You are provided with a story sourced from Reddit. Your task is to transform this narrative into a version that is fully appropriate for posting on platforms such as YouTube or TikTok. This involves a careful revision to remove, replace, or reframe any explicit, offensive, or sensitive content while maintaining the original narrative's story. The revised story should be engaging, clear, and suitable for a diverse, general audience and almost as long as the original story.

Please follow these guidelines in your transformation:
1. Make the text AI voice friendly and suitable for an AI voice to read.
2. Remove or alter any content that may be deemed inappropriate, explicit, or offensive.
3. Adjust the tone to be engaging and lively, ensuring the language is family-friendly and accessible.
4. Maintain the coherence and flow of the original story while enhancing its appeal for a social media audience.
5. Ensure you respond with text only, without using things like emojis
6. Make the story moe suitable for text to speech generation
7. Replace the words AITA and AITAH with Am I the asshole?

Ensure you respond with only the transformed story and nothing else
`,
      },
      { role: "user", content: title + "\n\n" + story },
    ],
  });

  // console.log(response, response.choices)

  if (!response.choices?.length) {
    throw new Error("No response from OpenAI");
  }

  return response.choices[0].message.content!;
}

async function generateAudioElevenLabs(story: RedditStory) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const audio = await elevenlabs.textToSpeech.convert("cjVigY5qzO86Huf0OWal", {
    text: await processText(story.title, story.body),
  });

  const stream = fs.createWriteStream(AUDIO_SRC);
  audio.pipe(stream);

  return { src: AUDIO_SRC, stream: audio };
}

async function generateAudioOpenaAI(story: RedditStory) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: await processText(story.title, story.body),
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(AUDIO_SRC, buffer);

  return { src: AUDIO_SRC, stream: Readable.from(buffer) };
}

async function generateAudioZyphra(story: RedditStory) {
  const AUDIO_SRC = path.join(AUDIO_DIR, `${story.name}.mp3`);
  const blob = await zyphra.audio.speech.create({
    text: await processText(story.title, story.body),
    speaking_rate: 15,
    speaker_audio: await fs.promises.readFile(
      path.join(AUDIO_DIR, "eleven.wav"),
      "base64"
    ),
    mime_type: "audio/mp3",
  });
  const buffer = Buffer.from(await blob.arrayBuffer());

  await fs.promises.writeFile(AUDIO_SRC, buffer);
  return { src: AUDIO_SRC, stream: Readable.from(buffer) };
}

function generateAudioLocal(story: RedditStory, useDia?: boolean) {
  return new Promise<StreamSrc>(async (resolve, reject) => {
    const outputPath = path.join(CWD, "media/audios", `${story.name}.mp3`);
    const text = await processText(story.title, story.body);

    const scriptArgs = [
      path.join(CWD, "utils/main.py"),
      "audio",
      "-o",
      outputPath,
    ];

    if (useDia) {
      scriptArgs.push("--use-dia");
    }
    scriptArgs.push(text);

    const proc = spawn("python3", scriptArgs, {
      cwd: process.cwd(),
      stdio: "pipe",
      }
    );

    proc.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    proc.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    proc.on("error", reject);
    proc.on("exit", async (code) => {
      try {
        resolve(await readAsReadable({ filePath: outputPath }));
      } catch {
        reject(new Error("Failed to generate audio"));
      }
    });
  });
}

export async function generateAudio(story: RedditStory, useDia?: boolean) {
  const outputPath = path.join(CWD, "media/audios", `${story.name}.mp3`);
  if (await fs.promises.exists(outputPath)) {
    return await readAsReadable({ filePath: outputPath });
  }

  if (process.env.AUDIO_GENERATOR === "elevenlabs") {
    return generateAudioElevenLabs(story);
  } else if (process.env.AUDIO_GENERATOR === "openai") {
    return generateAudioOpenaAI(story);
  } else if (process.env.AUDIO_GENERATOR === "zyphra") {
    return generateAudioZyphra(story);
  } else if (process.env.AUDIO_GENERATOR === "local") {
    return generateAudioLocal(story, useDia); // Pass useDia to local generator
  } else {
    // Default or fallback if no generator is specified, could be local without Dia
    // or throw an error as before. For now, let's assume local if not specified.
    // Consider if a default behavior or stricter check is needed.
    // If AUDIO_GENERATOR is undefined or an unknown value, and you want to default to local:
    // return generateAudioLocal(story, useDia);
    // Or, to maintain current behavior of throwing error for unconfigured/unknown:
    throw new Error(
      `Unsupported or unspecified audio generator: ${process.env.AUDIO_GENERATOR}`
    );
  }
}
