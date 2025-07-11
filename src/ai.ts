import { generateText } from "ai";
import { OpenAI } from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { ZyphraClient } from "@zyphra/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const elevenlabs = new ElevenLabsClient();
export const zyphra = new ZyphraClient({ apiKey: process.env.ZYPHRA_API_KEY! });

export const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Helper function to process text using Vercel AI SDK
export async function processTextWithAI(
  title: string,
  story: string,
): Promise<string> {
  const { text } = await generateText({
    model: openrouter(process.env.OPENROUTER_MODEL || "gpt-4o-mini", {}),
    prompt: `You are an expert text-to-speech content creator. Transform this Reddit story into a version optimized for AI voice narration on YouTube and TikTok. Focus on creating natural, engaging audio content that flows smoothly when spoken aloud, minimizing excessive punctuation.

VOICE-OPTIMIZED WRITING GUIDELINES:
1. Use simple, conversational language that sounds natural when spoken
2. Break up long sentences into shorter, digestible phrases
3. Use "I" statements and direct address to create intimacy with listeners
4. Replace complex punctuation with natural speech breaks
5. Convert abbreviations to full words (AITA → "Am I the asshole", etc. → "and so on")
6. Use transitional phrases that work well in audio ("So here's what happened", "Now listen to this", "But wait, there's more")
7. Add emotional context words that help voice inflection ("I was absolutely furious", "I whispered quietly")

CONTENT REQUIREMENTS:
- Keep family-friendly and platform-appropriate
- Maintain the original story structure and key details
- Make it engaging for audio-only consumption
- Ensure smooth pacing for 2-3 minute narration
- Add natural storytelling elements ("Let me tell you about", "You won't believe what happened next")

VOICE-FRIENDLY FORMATTING:
- Spell out numbers and symbols in words
- Remove special characters that don't translate to speech

Transform this story now:

Title: ${title}
Story: ${story}

Return only the voice-optimized story raw text with no other additional text, only the story!! Ensure minimal use of punctuation for a cleaner audio experience.:`,
    temperature: 0.6,
    maxTokens: 2500,
  });

  return text;
}
