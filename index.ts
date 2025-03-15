import "dotenv/config";

import path from "path";
import dedent from "dedent";
import { readFile } from "fs/promises";
import { Command } from "commander";

import { CWD } from "./constants";
import { generateAudio } from "./audio";
import { uploadToYoutube } from "./uploader";
import { grabStories } from "./sources/reddit";
import { createUploadableVideo } from "./video";
import { grabGameplayVideo } from "./scrapers";
import { exists } from "fs/promises";

import type { RedditStory } from "./types";
import { AsyncQueue, readAsReadable } from "./utils";

const program = new Command();

program
  .name("social-video-generator")
  .description("CLI tool to generate social media videos.")
  .version("0.0.1");

const SUBREDDITS = {
  stories: [
    // "RedditStoryTime",
    // "sexstories",
    // "AskReddit",
    // "RedditHorrorStories",
    // "AskRedditAfterDark",
    // "RedditStoriesYT",
    "stories",
    // "gonewildstories",
  ],
  aita: ["AITAH"],
  til: ["todayilearned"],
};

async function generate(story: RedditStory) {
  console.log(`[GENERATING]: Story: ${story.title} (${story.name})`);
  const outputPath = path.join(CWD, "media/outputs", `${story.name}.mp4`);
  if (await exists(outputPath)) {
    console.log(`[SKIPPING]: Story already exists\n\n`);
    return {
      audio: await readAsReadable({
        filePath: path.join(CWD, "media/audios", `${story.name}.mp3`),
      }),
      video: await readAsReadable({
        filePath: path.join(CWD, "media/outputs", `${story.name}.mp4`),
      }),
      final: await readAsReadable({ filePath: outputPath }),
    };
  }

  const audio = await generateAudio(story);
  console.log(`[🎶]: Generated audio`);
  const video = await grabGameplayVideo();

  const final = await createUploadableVideo(audio, video, { story });
  console.log(`[✅]: Generated video at ${outputPath} \n\n`);

  return { audio, video, final };
}

program
  .command("generate")
  .option("-s, --story <string>", "story")
  .description("Generate a video")
  .action(async (options: { story: string }) => {
    if (options.story) {
      const story = (await readFile(
        path.join(CWD, "media/scripts", `${options.story}.json`),
        "utf-8"
      ).then(JSON.parse)) as RedditStory;

      const output = await generate(story);
      const result = await uploadToYoutube(
        output.final.src, story.title,
        dedent`
          This is a summary of a reddit story by reddit user u/${story.author.name}.
          Read what people have to say about this story at ${story.url}
        `,
        "private"
      );

      if (result.success) {
        console.log("Video uploaded successfully!");
        console.log("Video URL:", result.videoUrl);
      } else {
        console.log("Upload failed:", result.error);
      }
    } else {
      const queue = new AsyncQueue();
      const stories = await grabStories(SUBREDDITS.aita);
      for (const story of stories.slice(0, 4)) {
        queue.add(() => generate(story));
      }
      await queue.run({ concurrency: 1 });
    }
  });

program.parse();

`

This is a summary of a reddit story by reddit user u/
Read what people have to say about this story at 

`;
