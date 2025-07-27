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
    prompt: `You are an expert text-to-speech content creator tasked with transforming a Reddit story into a natural, engaging version optimized for AI voice narration using the Deepseek R1 model and Kokoro 82M voice model for YouTube and TikTok. The output should flow smoothly when spoken aloud, feel conversational, and grab attention quickly. Aim for 300-450 words to fit a 2-3 minute narration.
    Guidelines for Voice-Optimized Writing:

    Write in simple, conversational language using "I" statements and direct address like "you know" or "let me tell you" to connect with listeners
    Replace complex punctuation with short sentences for natural speech breaks. Use periods for pauses and avoid commas unless essential
    Convert abbreviations to full words, like "Am I the asshole" for AITA and "and so on" for etc
    Include audio-friendly transitions like "So here’s the deal" or "You won’t believe this"
    Spell out numbers and symbols in words, like "five" instead of "5"
    Remove special characters that don’t translate to speech

    Content Requirements:

    Keep it family-friendly and suitable for YouTube and TikTok
    Preserve the original story’s structure and key details
    Start with a strong hook to draw listeners in immediately
    Add storytelling phrases like "Picture this" or "Here’s where it gets wild" for engagement

    Transform the story below into voice-optimized text. Use the provided title and story content. Output only the transformed story text, with no title or extra comments.

    Title: ${title}
    Story: ${story}
    `,
    temperature: 0.8,
    maxTokens: 3000,
  });

  return text;
}
