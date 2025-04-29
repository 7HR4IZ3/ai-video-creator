import path from "node:path";
import { ChildProcess, exec, spawn } from "node:child_process";

import { CWD } from "./constants";
import { readAsReadable } from "./utils";

import type { StreamSrc, RedditStory } from "./types";

export function createUploadableVideo(
  audio: StreamSrc,
  video: StreamSrc,
  { story }: { story: RedditStory }
): Promise<StreamSrc> {
  return new Promise((resolve, reject) => {
    const audioPath = audio.src;
    const videoPath = path.join(CWD, "media/videos", `minecraft.mp4`);
    const subtitlePath = path.join(CWD, "media/subtitles", `${story.name}.srt`);
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
      ],
      {
        cwd: process.cwd(),
        stdio: "inherit",
      }
    );

    proc.on("error", reject);

    proc.on("exit", (message) => {
      resolve(readAsReadable({ filePath: outputPath }));
    });
  });
}
