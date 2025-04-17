import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { monitorOpenAI } from "lunary/openai";
import { ZyphraClient } from "@zyphra/client";

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
});
export const elevenlabs = new ElevenLabsClient();
export const zyphra =new ZyphraClient({ apiKey: process.env.ZYPHRA_API_KEY! });
