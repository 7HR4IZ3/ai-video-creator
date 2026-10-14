import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { editStory } from "./editor";
import { synthesizeStory } from "./voice";

const { values } = parseArgs({ args: Bun.argv.slice(2), options: {
  source: { type: "string" }, seconds: { type: "string", default: "75" },
  audio: { type: "boolean", default: false }, force: { type: "boolean", default: false },
  model: { type: "string" }, provider: { type: "string" }, "voice-model": { type: "string" },
  "output-dir": { type: "string" }, help: { type: "boolean" },
} });
if (values.help || !values.source) {
  console.log("bun run src/story/cli.ts --source story.json [--seconds 75] [--provider opencode|openrouter] [--model provider/model] [--audio] [--voice-model qwen3-custom|kokoro|chatterbox-nano|chatterbox-turbo] [--force]");
  process.exit(values.help ? 0 : 1);
}
try {
  if (values.provider) process.env.STORY_AI_PROVIDER = values.provider;
  if (values.model) {
    if ((process.env.STORY_AI_PROVIDER || "opencode") === "opencode") process.env.OPENCODE_STORY_MODEL = values.model;
    else process.env.OPENROUTER_MODEL = values.model;
  }
  const source = JSON.parse(await readFile(values.source, "utf8"));
  const production = await editStory(source, { targetSeconds: Number(values.seconds), force: values.force, directory: values["output-dir"] });
  console.log(`\n${production.draft.title}\n\n${production.narration}\n`);
  console.log(`[Story] ${production.wordCount} words, estimated ${production.estimatedSeconds}s; model ${production.model}`);
  if (values.audio) console.log(`[Story] Audio: ${(await synthesizeStory(production, { model: values["voice-model"] })).output}`);
} catch (error) {
  console.error(`[Story] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
