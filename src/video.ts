import path from "node:path";
import { ChildProcess, exec, spawn } from "node:child_process";

import { CWD } from "./constants";
import { readAsReadable } from "./utils";
import { generateRedditScreenshotHTML } from "./screenshot";

import type { StreamSrc, RedditStory } from "./types";

export function createUploadableVideo(
  audio: StreamSrc,
  video: StreamSrc,
  { story }: { story: RedditStory },
): Promise<StreamSrc> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate screenshot first
      console.log(`[Video] Generating screenshot for ${story.name}`);
      const screenshotPath = await generateRedditScreenshotHTML(story, {
        width: 800,
        height: 600,
        deviceScaleFactor: 2,
        quality: 95,
      });

      const audioPath = audio.src;
      const videoPath = path.join(CWD, "media/videos", `minecraft.mp4`);
      const subtitlePath = path.join(
        CWD,
        "media/subtitles",
        `${story.name}.srt`,
      );
      const outputPath = path.join(CWD, "media/outputs", `${story.name}.mp4`);

      const proc = spawn(
        "python3",
        [
          path.join(CWD, "utils/main.py"),
          "editor",
          "-a",
          audioPath,
          "-v",
          videoPath,
          "-s",
          subtitlePath,
          "-o",
          outputPath,
          "--screenshot",
          screenshotPath,
        ],
        {
          cwd: process.cwd(),
          stdio: "inherit",
        },
      );

      proc.on("error", reject);

      proc.on("exit", (message) => {
        resolve(readAsReadable({ filePath: outputPath }));
      });
    } catch (error) {
      reject(error);
    }
  });
}
