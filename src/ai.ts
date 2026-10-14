import { OpenAI } from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { ZyphraClient } from "@zyphra/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createHash } from "node:crypto";
import { editStory } from "./story/editor";

// Construct paid-provider clients only when that provider is selected.
export const getElevenLabs = () => new ElevenLabsClient();
export const getZyphra = () => new ZyphraClient({ apiKey: process.env.ZYPHRA_API_KEY! });
export const getOpenAI = () => new OpenAI({ baseURL: process.env.OPENAI_API_URL, apiKey: process.env.OPENAI_API_KEY });
export const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export async function processTextWithAI(title: string, body: string): Promise<string> {
  const name = `story_${createHash("sha256").update(title + body).digest("hex").slice(0, 16)}`;
  return (await editStory({ id: name, name, title, body, url: "", author: { name: "" } })).narration;
}
