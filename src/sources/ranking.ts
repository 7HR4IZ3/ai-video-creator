import fs from "node:fs/promises";
import path from "node:path";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CWD } from "../constants";

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export interface RankingItem {
    rank: number;
    title: string;
    description: string;
    searchQuery: string;  // Query to find clip
    clipUrl?: string;     // YouTube URL for clip
    clipPath?: string;    // Downloaded local path
}

export interface RankingVideo {
    id: string;
    topic: string;
    items: RankingItem[];
    createdAt: Date;
}

// Popular ranking topics for auto-generation
const RANKING_TOPICS = [
    "football goals of the decade",
    "movie plot twists",
    "video game boss fights",
    "celebrity interview moments",
    "anime fight scenes",
    "sports fails",
    "movie quotes",
    "viral internet moments",
    "unexpected talent show performances",
    "gaming speedrun moments",
];

/**
 * Generate a random ranking topic using AI
 */
export async function generateRankingTopic(): Promise<string> {
    const { text } = await generateText({
        model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
        prompt: `Generate a single interesting, specific ranking topic for a viral YouTube Shorts video.
    
Examples of good topics:
- "Top 5 Most Iconic Basketball Dunks in History"
- "Top 7 Unexpected Movie Villain Redemptions"
- "Top 5 Video Game Bosses That Made Players Rage Quit"

Requirements:
- Be specific and niche (not generic like "best movies")
- Should be visually interesting for video clips
- Pick something with existing YouTube content available
- Number should be between 5-10

Output ONLY the topic title, nothing else.`,
        temperature: 0.9,
        maxTokens: 100,
    });

    return text.trim();
}

/**
 * Generate ranking items for a given topic
 */
export async function generateRankingItems(
    topic: string,
    count: number = 5
): Promise<RankingItem[]> {
    const { text } = await generateText({
        model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
        prompt: `Create a ranking list for: "${topic}"
    
Generate exactly ${count} items ranked from ${count} to 1 (${count} being lowest rank, 1 being best).

For each item, provide:
1. The rank number
2. A catchy title (max 10 words)
3. A brief exciting description for narration (20-30 words, no abbreviations)
4. A YouTube search query to find a clip of this moment

Output as JSON array with this exact structure:
[
  {
    "rank": ${count},
    "title": "Item Title",
    "description": "Brief exciting description for voice narration...",
    "searchQuery": "specific youtube search query"
  }
]

Make rankings controversial but defensible. Build suspense toward #1.
Output ONLY valid JSON, no markdown or explanation.`,
        temperature: 0.7,
        maxTokens: 2000,
    });

    try {
        const items = JSON.parse(text.trim()) as RankingItem[];
        return items.sort((a, b) => b.rank - a.rank); // Sort descending (5, 4, 3, 2, 1)
    } catch (error) {
        console.error("[Ranking] Failed to parse AI response:", text);
        throw new Error("Failed to generate ranking items");
    }
}

/**
 * Generate narration script for the ranking video
 */
export async function generateRankingNarration(
    ranking: RankingVideo
): Promise<string> {
    const itemDescriptions = ranking.items
        .map((item) => `#${item.rank}: ${item.title} - ${item.description}`)
        .join("\n");

    const { text } = await generateText({
        model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
        prompt: `Create an engaging voice-over script for a "${ranking.topic}" ranking video.

Items in order of appearance:
${itemDescriptions}

Requirements:
- Start with a hook: "You will NOT believe what made it to number one..."
- Build suspense between items
- Each item gets 5-8 seconds of narration
- Use exclamations and rhetorical questions
- End with a satisfying conclusion about #1
- NO abbreviations, NO emojis
- Write numbers as words
- Total length: about 60-90 seconds of audio

Output ONLY the narration script.`,
        temperature: 0.75,
        maxTokens: 1500,
    });

    return text.trim();
}

/**
 * Create a complete ranking video data structure
 */
export async function createRankingVideo(
    topic?: string,
    count: number = 5
): Promise<RankingVideo> {
    const videoTopic = topic || (await generateRankingTopic());
    const items = await generateRankingItems(videoTopic, count);

    const ranking: RankingVideo = {
        id: `ranking_${Date.now()}`,
        topic: videoTopic,
        items,
        createdAt: new Date(),
    };

    // Save ranking data
    const rankingDir = path.join(CWD, "media/rankings");
    await fs.mkdir(rankingDir, { recursive: true });
    await fs.writeFile(
        path.join(rankingDir, `${ranking.id}.json`),
        JSON.stringify(ranking, null, 2)
    );

    console.log(`[Ranking] Created ranking: ${ranking.topic}`);
    return ranking;
}

/**
 * Get a random topic from predefined list
 */
export function getRandomTopic(): string {
    return RANKING_TOPICS[Math.floor(Math.random() * RANKING_TOPICS.length)];
}
