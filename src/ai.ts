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
      You are an expert narrator creating captivating voice-over scripts for YouTube Shorts and TikTok. Transform this Reddit story into an engaging 60-90 second audio narrative that hooks listeners instantly.

      ---
      **VOICE OPTIMIZATION RULES**
      
      1. **Hook First**: Start with a compelling hook that grabs attention in the first 3 seconds
         - "You won't believe what happened when..."
         - "This is the craziest thing I've ever experienced..."
         
      2. **Emotional Markers**: Add natural emotional cues
         - Use ONE word in CAPS per paragraph for emphasis: "I was absolutely SHOCKED"
         - Add pause markers with ellipsis: "And then... it happened"
         - Include breath beats: "So here's the thing..."
         
      3. **Pacing Mastery**:
         - Short, punchy sentences for tension and drama
         - Slightly longer sentences for descriptions
         - End sections with hooks: "But that's not even the worst part"
         
      4. **TTS-Perfect Formatting**:
         - Spell out ALL numbers: "three hundred dollars" not "300"
         - No abbreviations: "Am I the asshole" not "AITA"
         - Write contractions as full words: "I am" not "I'm", "cannot" not "can't"
         - Phonetic spellings for unusual words if needed
         
      5. **Conversational Flow**:
         - Use "I" statements for intimacy
         - Address the listener with "you": "Can you imagine?"
         - Natural transitions: "So anyway", "But here is the thing", "Fast forward to"
         
      6. **Clean Output**:
         - NO emojis, markdown, or special characters
         - NO meta-commentary or labels
         - NO introduction like "Here's the story" - dive right in
         - Output ONLY the narration script
      ---
      
      **CONTENT REQUIREMENTS**
      - Keep it family-friendly and platform-appropriate
      - Preserve key story beats and emotional arc
      - Build to a satisfying conclusion or cliffhanger
      - Total length: 150-300 words for 60-90 seconds of audio
      
      ---
      Title: ${title}
      Story: ${story}
    `,
    temperature: 0.75,
    maxTokens: 2500,
  });

  return text;
}
