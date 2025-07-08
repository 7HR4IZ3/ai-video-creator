import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import path from "path";
import dedent from "dedent";
import { Command } from "commander";
import { readFile, readdir } from "fs/promises";

import { CWD } from "./constants";
import { generateAudio } from "./audio";
import { grabStories } from "./sources/reddit";
import { createUploadableVideo } from "./video";
import { grabGameplayVideo } from "./scrapers";
import { exists } from "fs/promises";
import {
  uploadVideo,
  type UploadPlatform,
  type UploadResult,
} from "./uploaders";

import type { RedditStory, StreamSrc } from "./types";
import { AsyncQueue, readAsReadable, initializeDirectories } from "./utils";

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

async function generate(story: RedditStory, skipVideo = false, useDia = false) {
  let audio;

  console.log(`[GENERATING]: Story: ${story.title} (${story.name})`);

  const audioPath = path.join(CWD, "media/audios", `${story.name}.mp3`);
  const videoPath = path.join(CWD, "media/outputs", `${story.name}.mp4`);
  const outputPath = path.join(CWD, "media/outputs", `${story.name}.mp4`);

  if (await exists(outputPath)) {
    console.log(`[SKIPPING]: Story already exists\n\n`);
    return {
      audio: await readAsReadable({
        filePath: audioPath,
      }),
      video: await readAsReadable({
        filePath: videoPath,
      }),
      final: await readAsReadable({ filePath: outputPath }),
    };
  }

  console.log(`[🎶]: Generating audio`);

  if (await exists(audioPath)) {
    console.log(`[➡️]: Skipping audio generation`);
    audio = await readAsReadable({ filePath: audioPath });
  } else {
    audio = await generateAudio(story, useDia); // Pass useDia flag
    console.log(`[✅]: Generated audio`);
  }

  if (skipVideo) {
    console.log(`[➡️]: Skipping video generation`);

    return {
      audio,
      video: await readAsReadable({ filePath: videoPath }),
      final: await readAsReadable({ filePath: outputPath }),
    };
  }

  console.log(`[🎬]: Generating video`);
  const video = await grabGameplayVideo();
  const final = await createUploadableVideo(audio, video, { story });
  console.log(`[✅]: Generated video at ${outputPath} \n\n`);

  return { audio, video, final };
}

async function uploadToDestination(
  platform: UploadPlatform,
  output: StreamSrc,
  story: RedditStory,
  privacy: string = "private",
  options: Record<string, any> = {},
) {
  console.log(`[🚀]: Uploading video to ${platform}`);

  const description = dedent`
    This is a summary of a reddit story by reddit user u/${story.author.name}.
    Read what people have to say about this story at ${story.url}
  `;

  const result = await uploadVideo(
    platform,
    output,
    story.title,
    description,
    privacy,
    options,
  );

  if (result.success) {
    console.log(`[✅]: Video uploaded successfully to ${platform}!`);
    console.log(`[🔗]: Video URL: ${result.videoUrl}`);
  } else {
    console.log(`[❌]: Upload to ${platform} failed: ${result.error}`);
  }

  return result;
}

program
  .command("generate")
  .option("-s, --story <string>", "story")
  .option("--story-id <string>", "specific story ID to generate")
  .option("--subreddit <string>", "subreddit to fetch stories from")
  .option("-c, --concurrent <number>", "concurrent")
  .option("-r, --reddit <string>", "reddit")
  .option("--mode <string>", "mode")
  .option("--limit <number>", "limit")
  .option("--skip-upload", "skip upload")
  .option("--skip-video", "skip video")
  .option("--use-dia", "use Dia model for audio generation") // Added --use-dia option
  .option(
    "--platforms <string>",
    "upload platforms (youtube, facebook, tiktok, filesystem)",
    "youtube",
  )
  .option(
    "--privacy <string>",
    "privacy setting (private, public, unlisted)",
    "private",
  )
  .description("Generate a video")
  .action(
    async (options: {
      story?: string;
      storyId?: string;
      subreddit?: string;
      concurrent?: number;
      limit?: number;
      mode?: "shorts" | "longform";
      reddit?: string;
      skipUpload?: boolean;
      skipVideo?: boolean;
      useDia?: boolean; // Added useDia to options type
      platforms?: string;
      privacy?: string;
    }) => {
      // Initialize directories
      await initializeDirectories();

      // Validate platforms
      const platforms = options.platforms;
      const validPlatforms: UploadPlatform[] = [
        "youtube",
        "facebook",
        "tiktok",
        "filesystem",
      ];

      for (const platform of platforms?.split(",") || []) {
        if (!validPlatforms.includes(platform.trim() as UploadPlatform)) {
          console.error(
            `[❌]: Invalid platform "${platform}". Valid options are: ${validPlatforms.join(
              ", ",
            )}`,
          );
          return process.exit(0);
        }
      }

      if (options.story) {
        const storyPath = path.join(
          CWD,
          "media/scripts",
          `${options.story}.json`,
        );
        const story: RedditStory = await readFile(storyPath, "utf-8").then(
          JSON.parse,
        );

        const output = await generate(story, options.skipVideo, options.useDia); // Pass useDia to generate function

        if (!options.skipUpload && platforms) {
          for (const platform of platforms.split(",")) {
            await uploadToDestination(
              platform.trim() as UploadPlatform,
              output.final,
              story,
              options.privacy,
            );
          }
        } else {
          console.log("[🚀]: Upload skipped.");
        }
      } else {
        const queue = new AsyncQueue();

        // Determine which subreddit to use
        let subredditKey = "aita";
        if (options.subreddit) {
          // Map subreddit names to SUBREDDITS keys
          const subredditMap: { [key: string]: keyof typeof SUBREDDITS } = {
            stories: "stories",
            AITAH: "aita",
            todayilearned: "til",
          };
          subredditKey = subredditMap[options.subreddit] || "aita";
        }

        const stories = await grabStories(
          SUBREDDITS[subredditKey as keyof typeof SUBREDDITS],
        );

        // If a specific story ID is provided, find that story
        let storiesToProcess = stories;
        if (options.storyId) {
          const specificStory = stories.find(
            (s) => s.id === options.storyId || s.name === options.storyId,
          );
          if (specificStory) {
            storiesToProcess = [specificStory];
          } else {
            console.log(`[❌]: Story with ID "${options.storyId}" not found`);
            return process.exit(1);
          }
        }

        for (const story of storiesToProcess.slice(0, options.limit ?? 6)) {
          queue.add(async () => {
            const output = await generate(
              story,
              options.skipVideo,
              options.useDia,
            ); // Pass useDia to generate function

            if (!options.skipUpload && platforms) {
              for (const platform of platforms.split(",")) {
                await uploadToDestination(
                  platform.trim() as UploadPlatform,
                  output.final,
                  story,
                  options.privacy,
                );
              }
            }
            return output;
          });
        }
        await queue.run({ concurrency: options.concurrent ?? 2 });
      }
    },
  );

// Add a new command for multi-platform uploads
program
  .command("upload")
  .option(
    "-s, --story <string>",
    "story name to upload, or 'all' to upload all generated videos",
  )
  .option("--story-id <string>", "specific story ID to upload")
  .option(
    "-p, --platforms <string>",
    "comma-separated list of platforms to upload to",
    "youtube",
  )
  .option("--platform <string>", "single platform to upload to")
  .option(
    "--privacy <string>",
    "privacy setting (private, public, unlisted)",
    "private",
  )
  .description("Upload an existing video to multiple platforms")
  .action(
    async (options: {
      story?: string;
      storyId?: string;
      platforms?: string;
      platform?: string;
      privacy?: string;
      concurrent?: number; // Added for batch processing
    }) => {
      interface StoryUploadSummary {
        storyName: string;
        platformResults: {
          platform: string;
          result: UploadResult;
        }[];
      }

      if (!options.story) {
        console.error(
          "[❌]: Story name or 'all' is required for the --story option",
        );
        return process.exit(0);
      }

      // Common platform validation
      const platformsToUpload = options.platforms?.split(",") || ["youtube"];
      const validPlatforms: UploadPlatform[] = [
        "youtube",
        "facebook",
        "tiktok",
        "filesystem",
      ];
      const invalidPlatforms = platformsToUpload.filter(
        (p) => !validPlatforms.includes(p as UploadPlatform),
      );
      if (invalidPlatforms.length > 0) {
        console.error(
          `[❌]: Invalid platforms: ${invalidPlatforms.join(", ")}`,
        );
        console.error(`[ℹ️]: Valid options are: ${validPlatforms.join(", ")}`);
        return process.exit(0);
      }

      if (options.story.toLowerCase() === "all") {
        console.log("[🔄]: Preparing to upload all videos...");
        const outputsDir = path.join(CWD, "media/outputs");
        const scriptsDir = path.join(CWD, "media/scripts");
        const uploadQueue = new AsyncQueue<StoryUploadSummary>();
        let videosFound = 0;

        try {
          const outputFiles = await readdir(outputsDir);
          const videoFiles = outputFiles.filter((file) =>
            file.endsWith(".mp4"),
          );

          if (videoFiles.length === 0) {
            console.log("[ℹ️]: No .mp4 files found in media/outputs.");
            return process.exit(0);
          }

          console.log(`[ℹ️]: Found ${videoFiles.length} video(s) to process.`);

          for (const videoFile of videoFiles) {
            const storyName = videoFile.replace(".mp4", "");
            const currentVideoPath = path.join(outputsDir, videoFile);
            const currentStoryPath = path.join(scriptsDir, `${storyName}.json`);

            if (!(await exists(currentStoryPath))) {
              console.warn(
                `[⚠️]: Script file not found for video "${videoFile}" (expected at ${currentStoryPath}). Skipping.`,
              );
              continue;
            }
            videosFound++;

            uploadQueue.add(async () => {
              try {
                const storyData: RedditStory = await readFile(
                  currentStoryPath,
                  "utf-8",
                ).then(JSON.parse);
                console.log(`[⬆️]: Queueing upload for "${storyName}"...`);

                const overallResults: {
                  storyName: string;
                  platformResults: { platform: string; result: UploadResult }[];
                } = { storyName, platformResults: [] };

                for (const platform of platformsToUpload) {
                  const result = await uploadToDestination(
                    platform as UploadPlatform,
                    await readAsReadable({ filePath: currentVideoPath }),
                    storyData,
                    options.privacy,
                  );
                  overallResults.platformResults.push({ platform, result });
                }
                return overallResults;
              } catch (err) {
                console.error(
                  `[❌]: Error processing story "${storyName}": ${
                    (err as Error).message
                  }`,
                );
                return {
                  storyName,
                  platformResults: platformsToUpload.map((p) => ({
                    platform: p,
                    result: { success: false, error: (err as Error).message },
                  })),
                };
              }
            });
          }

          if (videosFound === 0) {
            console.log(
              "[ℹ️]: No videos found with corresponding script files.",
            );
            return process.exit(0);
          }

          // Explicitly type the result of uploadQueue.run
          const allUploadResults = await uploadQueue.run({
            concurrency: options.concurrent ?? 2,
          }); // Assuming run might return undefined for failed/empty tasks

          console.log("\n[📊]: Overall Upload Summary");
          allUploadResults.forEach(
            (uploadResult: StoryUploadSummary | undefined) => {
              if (uploadResult) {
                console.log(`\n--- Story: ${uploadResult.storyName} ---`);
                uploadResult.platformResults.forEach(
                  ({
                    platform,
                    result,
                  }: {
                    platform: string;
                    result: UploadResult;
                  }) => {
                    if (result.success) {
                      console.log(`  [✅]: ${platform}: ${result.videoUrl}`);
                    } else {
                      console.log(`  [❌]: ${platform}: ${result.error}`);
                    }
                  },
                );
              }
            },
          );
        } catch (error) {
          console.error(
            `[❌]: Error reading output directory: ${(error as Error).message}`,
          );
        }
      } else {
        // Logic for uploading a single, specified story
        const storyPath = path.join(
          CWD,
          "media/scripts",
          `${options.story}.json`,
        );
        const videoPath = path.join(
          CWD,
          "media/outputs",
          `${options.story}.mp4`,
        );

        if (!(await exists(storyPath)) || !(await exists(videoPath))) {
          console.error(
            `[❌]: Story or video file not found for "${options.story}"`,
          );
          return process.exit(0);
        }

        const story: RedditStory = await readFile(storyPath, "utf-8").then(
          JSON.parse,
        );
        const results: { platform: string; result: UploadResult }[] = [];
        for (const platform of platformsToUpload) {
          const result = await uploadToDestination(
            platform as UploadPlatform,
            await readAsReadable({ filePath: videoPath }),
            story,
            options.privacy,
          );
          results.push({ platform, result });
        }

        console.log("\n[📊]: Upload Summary");
        for (const { platform, result } of results) {
          if (result.success) {
            console.log(`[✅]: ${platform}: ${result.videoUrl}`);
          } else {
            console.log(`[❌]: ${platform}: ${result.error}`);
          }
        }
      }
      return process.exit(0);
    },
  );

// Add a command to list available stories
program
  .command("list")
  .option("--subreddit <string>", "subreddit to list stories from")
  .description("List available stories")
  .action(async (options: { subreddit?: string }) => {
    const scriptsDir = path.join(CWD, "media/scripts");
    const outputsDir = path.join(CWD, "media/outputs");

    try {
      const files = await readdir(scriptsDir, { withFileTypes: true });
      const storyFiles = files.filter(
        (file) => file.isFile() && file.name.endsWith(".json"),
      );

      console.log(`[📚]: Found ${storyFiles.length} stories:`);

      for (const file of storyFiles) {
        const storyName = file.name.replace(".json", "");
        const storyPath = path.join(scriptsDir, file.name);
        const videoPath = path.join(outputsDir, `${storyName}.mp4`);

        const storyData: RedditStory = await readFile(storyPath, "utf-8").then(
          JSON.parse,
        );
        const hasVideo = await exists(videoPath);

        console.log(
          `- ${storyName}: ${storyData.title} ${
            hasVideo ? "[✅ Video]" : "[❌ No Video]"
          }`,
        );
      }
    } catch (error) {
      console.error(`[❌]: Error listing stories: ${error}`);
    }
  });

// Add a command to configure platform credentials
program
  .command("configure")
  .option(
    "-p, --platform <string>",
    "platform to configure (youtube, facebook, tiktok)",
    "youtube",
  )
  .description("Configure platform credentials")
  .action(async (options: { platform?: string }) => {
    const platform = options.platform;
    const validPlatforms = ["youtube", "facebook", "tiktok"];

    if (!platform) {
      console.error(
        `[❌]: No platform selected. Options are: ${validPlatforms.join(", ")}`,
      );
      return process.exit(0);
    }

    if (!validPlatforms.includes(platform)) {
      console.error(
        `[❌]: Invalid platform "${platform}". Valid options are: ${validPlatforms.join(
          ", ",
        )}`,
      );
      return process.exit(0);
    }

    console.log(`[🔧]: Configuration guide for ${platform}:`);
    switch (platform) {
      case "youtube":
        console.log(`
1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project
3. Enable the YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add the following to your .env file:

YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
        `);
        break;

      case "facebook":
        console.log(`
1. Go to Facebook Developers (https://developers.facebook.com/)
2. Create a new app
3. Add the Facebook Login product
4. Create a Page Access Token with manage_pages and publish_video permissions
5. Add the following to your .env file:

FACEBOOK_ACCESS_TOKEN=your_page_access_token
FACEBOOK_PAGE_ID=your_page_id
        `);
        break;

      case "tiktok":
        console.log(`
1. Go to TikTok for Developers (https://developers.tiktok.com/)
2. Create a new app
3. Enable the Video Upload API
4. Generate an access token
5. Add the following to your .env file:

TIKTOK_ACCESS_TOKEN=your_access_token
        `);
        break;
    }

    console.log(
      "\n[ℹ️]: After updating your .env file, restart the application for changes to take effect.",
    );
  });

program.parse();
