import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { monitorOpenAI } from "lunary/openai";
import { ZyphraClient } from "@zyphra/client";

export const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_URL,
  apiKey: process.env.OPENAI_API_KEY,
});
export const elevenlabs = new ElevenLabsClient();
export const zyphra =new ZyphraClient({ apiKey: process.env.ZYPHRA_API_KEY! });
