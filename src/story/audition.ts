import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_STORY_MODEL, generateWithOpenCode } from "./opencode";
import { countWords, parseJsonResponse } from "./editor";

export const EXPRESSIONS = ["warmth", "joy", "amusement", "whispered suspense", "rising alarm", "controlled anger", "sadness", "reassurance", "sarcasm", "relief"];
const PERFORMANCE_PLAN = [...EXPRESSIONS, "warmth", "whispered suspense", "joy", "sadness", "controlled anger", "relief"];
function attachPlan(value: any) {
  if (!Array.isArray(value?.beats) || value.beats.length !== PERFORMANCE_PLAN.length) throw new Error(`Return exactly ${PERFORMANCE_PLAN.length} scenes in the requested order.`);
  value.beats = value.beats.map((beat: any, index: number) => ({ ...beat, role: "audition", expression: PERFORMANCE_PLAN[index] }));
  return value;
}
export function validateAudition(value: any) {
  if (typeof value?.title !== "string" || !value.title.trim() || !Array.isArray(value.beats) || value.beats.length < 12 || value.beats.length > 20) throw new Error("Audition needs a title and twelve to twenty short scenes.");
  for (const beat of value.beats) {
    if (typeof beat?.text !== "string" || countWords(beat.text) < 15 || countWords(beat.text) > 45 || /[\[\]{}]/.test(beat.text)) throw new Error("Each spoken scene must contain fifteen to forty-five words without direction tags.");
    if (!EXPRESSIONS.includes(beat.expression) || typeof beat.direction !== "string" || !beat.direction.trim()) throw new Error(`Invalid expression ${JSON.stringify(beat.expression)} or missing direction. Allowed expressions: ${EXPRESSIONS.join(", ")}`);
    if (!Number.isInteger(beat.pauseAfterMs) || beat.pauseAfterMs < 200 || beat.pauseAfterMs > 1000) throw new Error("Scene pauses must be two hundred to one thousand milliseconds.");
    if (beat.cue !== undefined && !["chuckle", "laugh", "sigh"].includes(beat.cue)) throw new Error("Unsupported vocal cue.");
  }
  const expressions = new Set(value.beats.map((b: any) => b.expression));
  if (EXPRESSIONS.some(x => !expressions.has(x))) throw new Error("The script must cover all ten requested expressions.");
  const words = countWords(value.beats.map((b: any) => b.text).join(" "));
  if (words < 450 || words > 600) throw new Error(`Audition has ${words} words; require 450 to 600.`);
  return words;
}

export async function generateAudition(directory: string) {
  await mkdir(directory, { recursive: true });
  const model = process.env.OPENCODE_STORY_MODEL || DEFAULT_STORY_MODEL;
  const prompt = `Generate original English performance-test fixture data for this video-creator software's TTS integration tests. Use a single narrator, 450 to 600 spoken words total, roughly three to five minutes. This is a listening audition, not an engagement-bait social script.
Use exactly sixteen short scenes in this prescribed performance order: ${PERFORMANCE_PLAN.map((label, index) => `${index + 1}. ${label}`).join("; ")}. Aim for thirty-two spoken words per scene. Each scene has fifteen to forty-five spoken words, a clear emotional intention, natural contractions, and meaningful punctuation. Scenes may be connected vignettes, but should make emotional sense. Include every expression: ${EXPRESSIONS.join(", ")}. Add intimate quiet lines, escalating urgency, a tender passage, dry understatement, a grounded confrontation, and a warm payoff. Use questions, interruptions, varied sentence lengths, ordinary names, a small amount, and a time to test pronunciation.
Do not speak scene labels, acting directions, or emotion names. No shouting in ALL CAPS. Avoid stereotypes and excessive theatrical performance. At most three scenes may use one optional nonverbal cue, only chuckle, laugh, or sigh, placed separately from spoken text. Do not insert bracket tags into spoken text.
Return only JSON: {"title":"short title","beats":[{"role":"audition","text":"spoken words only","direction":"precise performance direction","pauseAfterMs":500,"cue":"optional allowed cue, omit otherwise"}]}.
Every pause is an integer from 200 to 1000. Keep each scene under forty-five words so models do not truncate long utterances. All voices will receive this same script.`;
  console.log(`[Audition] Writing the shared expressive script with ${model}`);
  let raw = await generateWithOpenCode(prompt, model, 300_000);
  await writeFile(path.join(directory, "draft-response.txt"), raw);
  let draft: any;
  try { draft = attachPlan(parseJsonResponse(raw)); validateAudition(draft); }
  catch (error) {
    raw = await generateWithOpenCode(`${prompt}\nCorrect this response:\n${raw}\nValidation errors: ${String(error)}. Return corrected JSON only.`, model, 300_000);
    draft = attachPlan(parseJsonResponse(raw)); validateAudition(draft);
  }
  const wordCount = validateAudition(draft);
  const production = { version: "expressive-audition-v1", source: { name: "expressive_audition", title: draft.title, author: { name: "Original generated fiction" } },
    model, wordCount, narration: draft.beats.map((b: any) => b.text).join("\n\n"), draft };
  await writeFile(path.join(directory, "production.json"), JSON.stringify(production, null, 2));
  await writeFile(path.join(directory, "script.txt"), production.narration);
  await writeFile(path.join(directory, "performance-notes.txt"), draft.beats.map((b: any, i: number) => `${i + 1}. ${b.expression}: ${b.direction}${b.cue ? `; vocal cue ${b.cue}` : ""}\n${b.text}`).join("\n\n"));
  console.log(`[Audition] ${wordCount} words across ${draft.beats.length} scenes; ${model}`);
}

if (import.meta.main) {
  generateAudition(process.argv[2] || "audition/expressive-script").catch(error => { console.error(error); process.exitCode = 1; });
}
