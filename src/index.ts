import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import path from "path";
import dedent from "dedent";
import { Command } from "commander";
import { readFile, readdir } from "fs/promises";

import { CWD } from "./constants";
import { generateAudio } from "./audio";
import { grabStories } from "./sources/reddit";
import { createRankingVideo, generateRankingNarration } from "./sources/ranking";
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

async function generate(story: RedditStory, skipVideo = false, useDia = false,
  settings: { background?: string; seconds?: number; voice?: string } = {}) {
  if (settings.voice && !["chatterbox-turbo", "chatterbox-nano", "qwen3-custom", "kokoro"].includes(settings.voice)) throw new Error("Unsupported local voice model.");
  if (settings.seconds !== undefined && (!Number.isFinite(settings.seconds) || settings.seconds < 30 || settings.seconds > 180)) throw new Error("Target duration must be thirty to one hundred eighty seconds.");
  console.log(`[GENERATING]: Story: ${story.title} (${story.name})`);
  const video = !skipVideo ? await grabGameplayVideo(settings.background) : undefined;
  const audio = await generateAudio(story, useDia, { targetSeconds: settings.seconds, voiceModel: settings.voice });
  if (skipVideo) return { audio, video: audio, final: audio };
  const final = await createUploadableVideo(audio, video!, { story });
  console.log(`[✅]: Generated video at ${final.src}`);
  return { audio, video: video!, final };
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
  .option("--source <file>", "generate from local story JSON without fetching Reddit")
  .option("--background <file>", "background footage to crop and loop")
  .option("--seconds <number>", "target narration duration", "75")
  .option("--voice <model>", "local voice model", "chatterbox-turbo")
  .option("--subreddit <string>", "subreddit to fetch stories from")
  .option("-c, --concurrent <number>", "concurrent")
  .option("-r, --reddit <string>", "reddit")
  .option("--mode <string>", "mode")
  .option("--limit <number>", "number of stories to generate", "1")
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
      source?: string;
      background?: string;
      seconds?: string;
      voice?: string;
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

      if (options.story || options.source) {
        const storyPath = options.source ? path.resolve(options.source) : path.join(CWD, "media/scripts", `${options.story}.json`);
        const story: RedditStory = await readFile(storyPath, "utf-8").then(
          JSON.parse,
        );

        const output = await generate(story, options.skipVideo, options.useDia, { background: options.background, seconds: Number(options.seconds), voice: options.voice }); // Pass useDia to generate function

        if (!options.skipUpload && !options.skipVideo && platforms) {
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

        const subreddits = options.subreddit ? options.subreddit.split(",").map(name => name.trim()).filter(Boolean) : SUBREDDITS.aita;
        const stories = await grabStories(subreddits);

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

        const limit = Number(options.limit ?? 1);
        if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("Story limit must be between one and thirty.");
        for (const story of storiesToProcess.slice(0, limit)) {
          queue.add(async () => {
            const output = await generate(
              story,
              options.skipVideo,
              options.useDia,
              { background: options.background, seconds: Number(options.seconds), voice: options.voice },
            ); // Pass useDia to generate function

            if (!options.skipUpload && !options.skipVideo && platforms) {
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
        await queue.run({ concurrency: Number(options.concurrent ?? 1) });
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
                  `[❌]: Error processing story "${storyName}": ${(err as Error).message
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
            concurrency: Number(options.concurrent ?? 1),
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
          `- ${storyName}: ${storyData.title} ${hasVideo ? "[✅ Video]" : "[❌ No Video]"
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

// ==========================================
// Ranking Video Mode
// ==========================================
program
  .command("generate-ranking")
  .option("--topic <string>", "ranking topic (auto-generates if not specified)")
  .option("--count <number>", "number of items in ranking", "5")
  .option("--skip-upload", "skip upload")
  .option(
    "--platforms <string>",
    "upload platforms (youtube, tiktok, filesystem)",
    "youtube",
  )
  .option("--privacy <string>", "privacy setting", "private")
  .description("Generate a ranking video (e.g., Top 5 X)")
  .action(
    async (options: {
      topic?: string;
      count?: string;
      skipUpload?: boolean;
      platforms?: string;
      privacy?: string;
    }) => {
      await initializeDirectories();

      console.log("[🏆] Starting ranking video generation...");

      try {
        // Create ranking
        const ranking = await createRankingVideo(
          options.topic,
          parseInt(options.count || "5"),
        );

        console.log(`[📝] Topic: ${ranking.topic}`);
        console.log(`[📊] Items: ${ranking.items.length}`);

        // Generate narration
        const narration = await generateRankingNarration(ranking);
        console.log("[🎙️] Narration generated");

        // Create story-like object for audio generation
        const storyLike = {
          id: ranking.id,
          name: ranking.id,
          title: ranking.topic,
          body: narration,
          url: "",
          author: { name: "AI" },
        };

        // Generate audio
        console.log("[🎶] Generating audio...");
        const audio = await generateAudio(storyLike as RedditStory);

        // TODO: Download clips for each ranking item
        // TODO: Stitch clips with number overlays
        // For now, use gameplay video as placeholder
        console.log("[🎬] Generating video...");
        const video = await grabGameplayVideo();
        const final = await createUploadableVideo(audio, video, {
          story: storyLike as RedditStory,
        });

        console.log("[✅] Ranking video generated!");

        // Upload if not skipped
        if (!options.skipUpload && options.platforms) {
          for (const platform of options.platforms.split(",")) {
            console.log(`[🚀] Uploading to ${platform}...`);
            await uploadVideo(
              platform.trim() as UploadPlatform,
              final,
              ranking.topic,
              `Top ${ranking.items.length} ranking video`,
              options.privacy,
            );
          }
        }
      } catch (error) {
        console.error("[❌] Error generating ranking video:", error);
        process.exit(1);
      }
    },
  );

// ==========================================
// Movie Recap Mode
// ==========================================
program
  .command("generate-recap")
  .requiredOption("--movie <file-or-url>", "exact episode video")
  .requiredOption("--episode <json>", "show and ordered episode metadata")
  .requiredOption("--work-dir <directory>", "episode artifacts and output")
  .option("--seconds <number>", "target recap duration", "300")
  .option("--voice <model>", "local narrator", "chatterbox-turbo")
  .option("--evidence <json>", "verified timestamped evidence instead of video analysis")
  .option("--subtitles <srt>", "subtitles matching the source edition")
  .option("--memory <json>", "versioned show memory bundle")
  .option("--inserts <json>", "explicit original-dialogue inserts")
  .description("Create an evidence-backed episode recap with Turbo and aligned captions")
  .action(async (options) => {
    const { spawn } = await import("node:child_process");
    const args = ["run", path.resolve(__dirname, "recap/cli.ts"), "all", "--video", options.movie,
      "--episode", options.episode, "--work-dir", options.workDir, "--seconds", options.seconds, "--voice", options.voice];
    for (const key of ["evidence", "subtitles", "memory", "inserts"]) if (options[key]) args.push(`--${key}`, options[key]);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, args, { stdio: "inherit" });
      child.on("error", reject);
      child.on("close", code => code === 0 ? resolve() : reject(new Error(`Episode recap failed (${code})`)));
    });
  });

await program.parseAsync().catch(error => { console.error(`[Error] ${error.message}`); process.exitCode = 1; });
