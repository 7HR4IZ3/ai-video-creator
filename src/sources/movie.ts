import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CWD } from "../constants";

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export interface RecapClip {
    index: number;
    startTime: number;      // In seconds
    endTime: number;        // In seconds
    duration: number;
    description: string;    // AI-generated description of scene
    summary: string;        // Short narration for this clip
    importance: "high" | "medium" | "low";
    clipPath?: string;      // Path to extracted clip
}

export interface MovieRecap {
    id: string;
    moviePath: string;
    movieTitle: string;
    totalDuration: number;
    clips: RecapClip[];
    narration: string;
    createdAt: Date;
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffprobe", [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            videoPath,
        ]);

        let output = "";
        proc.stdout.on("data", (data) => {
            output += data.toString();
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve(parseFloat(output.trim()));
            } else {
                reject(new Error(`ffprobe exited with code ${code}`));
            }
        });

        proc.on("error", reject);
    });
}

/**
 * Extract a clip from the movie
 */
async function extractClip(
    moviePath: string,
    startTime: number,
    endTime: number,
    outputPath: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", [
            "-i", moviePath,
            "-ss", startTime.toString(),
            "-t", (endTime - startTime).toString(),
            "-c:v", "libx264",
            "-c:a", "aac",
            "-y",
            outputPath,
        ]);

        proc.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        proc.on("error", reject);
    });
}

/**
 * Generate scene descriptions for time segments
 */
async function analyzeScenes(
    movieTitle: string,
    totalDuration: number,
    segmentCount: number
): Promise<RecapClip[]> {
    const segmentDuration = totalDuration / segmentCount;

    const { text } = await generateText({
        model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
        prompt: `You are analyzing the movie "${movieTitle}" to create a recap video.

The movie is ${Math.round(totalDuration / 60)} minutes long. 
Divide it into ${segmentCount} key scenes/moments that tell the core story.

For each scene, provide:
1. Approximate start time (in seconds from movie start)
2. Duration (keep clips 5-15 seconds each)
3. Brief description of what happens
4. One-sentence narration summary
5. Importance level (high/medium/low)

Focus on:
- Opening hook
- Key plot points
- Major reveals/twists
- Climax moments
- Resolution

Output as JSON array:
[
  {
    "startTime": 120,
    "duration": 10,
    "description": "Hero discovers the secret",
    "summary": "This is the moment everything changes...",
    "importance": "high"
  }
]

Output ONLY valid JSON.`,
        temperature: 0.6,
        maxTokens: 3000,
    });

    try {
        const scenes = JSON.parse(text.trim());
        return scenes.map((scene: any, index: number) => ({
            index,
            startTime: scene.startTime,
            endTime: scene.startTime + scene.duration,
            duration: scene.duration,
            description: scene.description,
            summary: scene.summary,
            importance: scene.importance,
        }));
    } catch (error) {
        console.error("[Recap] Failed to parse AI response");
        throw new Error("Failed to analyze scenes");
    }
}

/**
 * Generate complete recap narration
 */
async function generateRecapNarration(
    movieTitle: string,
    clips: RecapClip[]
): Promise<string> {
    const clipDescriptions = clips
        .filter((c) => c.importance === "high" || c.importance === "medium")
        .map((c, i) => `Scene ${i + 1}: ${c.description}`)
        .join("\n");

    const { text } = await generateText({
        model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
        prompt: `Create a captivating movie recap voice-over for "${movieTitle}".

Key scenes to cover:
${clipDescriptions}

Requirements:
- Start with a hook about the movie's premise
- Build dramatic tension
- Cover major plot points without spoiling everything
- End with a cliffhanger or compelling conclusion
- Length: 60-90 seconds of audio (150-250 words)
- NO abbreviations, NO emojis
- Write all numbers as words
- Conversational, engaging tone

Output ONLY the narration script.`,
        temperature: 0.7,
        maxTokens: 1500,
    });

    return text.trim();
}

/**
 * Create a complete movie recap
 */
export async function createMovieRecap(
    moviePath: string,
    movieTitle: string,
    maxClips: number = 5
): Promise<MovieRecap> {
    console.log(`[Recap] Starting recap for: ${movieTitle}`);

    // Create output directory
    const recapDir = path.join(CWD, "media/recaps");
    await fs.mkdir(recapDir, { recursive: true });

    // Get movie duration
    const totalDuration = await getVideoDuration(moviePath);
    console.log(`[Recap] Movie duration: ${Math.round(totalDuration / 60)} minutes`);

    // Analyze scenes
    console.log("[Recap] Analyzing scenes with AI...");
    const allClips = await analyzeScenes(movieTitle, totalDuration, maxClips * 2);

    // Filter to high importance clips
    const clips = allClips
        .filter((c) => c.importance === "high")
        .slice(0, maxClips);

    console.log(`[Recap] Selected ${clips.length} key scenes`);

    // Extract clips
    const recapId = `recap_${Date.now()}`;
    const clipsDir = path.join(recapDir, recapId);
    await fs.mkdir(clipsDir, { recursive: true });

    for (const clip of clips) {
        const clipPath = path.join(clipsDir, `clip_${clip.index}.mp4`);
        console.log(`[Recap] Extracting clip ${clip.index + 1}/${clips.length}...`);
        await extractClip(moviePath, clip.startTime, clip.endTime, clipPath);
        clip.clipPath = clipPath;
    }

    // Generate narration
    console.log("[Recap] Generating narration...");
    const narration = await generateRecapNarration(movieTitle, clips);

    const recap: MovieRecap = {
        id: recapId,
        moviePath,
        movieTitle,
        totalDuration,
        clips,
        narration,
        createdAt: new Date(),
    };

    // Save recap data
    await fs.writeFile(
        path.join(recapDir, `${recapId}.json`),
        JSON.stringify(recap, null, 2)
    );

    console.log(`[Recap] Created recap with ${clips.length} clips`);
    return recap;
}
