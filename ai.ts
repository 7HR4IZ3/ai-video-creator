import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { monitorOpenAI } from "lunary/openai";
import { ZyphraClient } from "@zyphra/client";

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
});
export const elevenlabs =new ElevenLabsClient();
export const zyphra =new ZyphraClient({ apiKey: process.env.ZYPHRA_API_KEY! });
