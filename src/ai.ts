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
    prompt: `
      **Prompt for Deepseek R1 with Kokoro 82M Voice**
      
      You are an AI expert in adapting written stories for voice narration. Your task is to take a Reddit post and transform it into a fluid, engaging script optimized for the Kokoro 82M voice model. Write in a conversational tone that feels natural when spoken aloud on YouTube or TikTok.
      
      ---
      **TARGET OUTPUT**
      
      * A continuous, voice-friendly narrative (2–3 minutes) without introductory titles or metadata
      * Raw text only (no extra notes or labels)
      ---
      
      **VOICE-OPTIMIZED GUIDELINES**
      
      1. **Conversational Flow**: Use short, simple sentences. Write as if you’re speaking directly to one listener.
      2. **Personal Connection**: Include "I" statements and direct addressing ("you") to build rapport.
      3. **Natural Breaks**: Replace commas and semicolons with transitional phrases or pauses (e.g., "So here’s what happened", "But wait, there’s more").
      4. **Full Words**: Avoid abbreviations and acronyms. Write out things like "Am I the asshole" instead of "AITA".
      5. **Smooth Pacing**: Spell out numbers and common symbols ("three" instead of "3"; "percent" instead of "%").
      6. **Clean Formatting**: Eliminate emojis, markdown, and any special characters that won't read well aloud.
      7. **Storytelling Flourish**: Add natural lead‑ins ("Let me tell you", "You won’t believe what happened next").
      8. Expand punctuatuons: For example ("Here's" to "Here is") etc.
      
      ---
      
      **CONTENT REQUIREMENTS**
      
      * Preserve the key events and structure of the original story
      * Keep tone family‑friendly and appropriate for YouTube/TikTok
      * Aim for an emotional arc: setup, conflict, resolution
      * Do not add anything else to the output
      * Only return the storey, with no additional output
      
      ---
      
      **EXAMPLE TRANSFORMATION**
      
      *Input:* "Title: AITA for refusing to pay rent? Story: ..."
      *Output (excerpt):*
      "Let me tell you about the time my roommate asked me to cover her share of rent. You won’t believe what happened next…"
      
      ---
      Now convert the story below into the optimized narration.
      
      Title: ${title}
      Story: ${story}

    `,
    temperature: 0.8,
    maxTokens: 3000,
  });

  return text;
}
