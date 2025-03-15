import { createReadStream } from "fs";
import { openai } from "./ai";

import type { Readable } from "stream";
import { writeFile } from "fs/promises";
import type { RedditStory } from "./types";

export async function generateTranscription(
  audio: {
    src: string;
    stream: Readable;
  },
  { story }: { story: RedditStory }
) {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: createReadStream(audio.src),
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  console.log(response);

  await writeFile(`./transcriptions/${story.id}`, response.text, {
    encoding: "utf8",
  });

  const { words } = JSON.parse(response.text);
  return words;
}
