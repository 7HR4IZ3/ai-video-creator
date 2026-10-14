import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { editStory, validateDraft, type StoryDraft } from "../../src/story/editor";
import { parseOpenCodeEvents } from "../../src/story/opencode";
import source from "./fixtures/source.json";

const hook = "My landlord charged me for changing the lock he'd told me to replace.";
function draft(): StoryDraft {
  return { title: "The spare key", premise: "A tenant challenges disputed lock charges.", sourceFacts: ["Key broke", "Permission in writing", "Spare key remained in shop"], hooks: [hook, "The spare key was still downstairs.", "I kept the text that saved my deposit."], selectedHook: 0, beats: [
    { role: "hook", text: hook, direction: "Quiet disbelief", pauseAfterMs: 100 },
    { role: "setup", text: "My key snapped inside the lock. My landlord was away, so he told me to call a locksmith and send him the receipt. I confirmed it by text before getting the cylinder replaced.", direction: "Matter of fact", pauseAfterMs: 150 },
    { role: "turn", text: "Then he listed two deposit deductions. An unauthorized lock change, and no spare key. I sent him his own messages. He said he still hadn't received the spare. The shopkeeper downstairs showed me the sealed envelope he'd asked me to leave. He hadn't collected it.", direction: "Restrained frustration", pauseAfterMs: 200 },
    { role: "payoff", text: "I sent him a photo. The next morning both charges disappeared. He promised reimbursement on my next statement. Now I follow every phone call with a text, so there is a written record.", direction: "Relieved but wary", pauseAfterMs: 0 },
  ] };
}

describe("story production", () => {
  test("reads OpenCode JSONL and rejects provider failures, including exit-zero error events", () => {
    expect(parseOpenCodeEvents('{"type":"step_start"}\n{"type":"text","part":{"text":"hello"}}\n')).toBe("hello");
    expect(() => parseOpenCodeEvents('{"type":"error","error":{"message":"403 access denied"}}')).toThrow("403 access denied");
    expect(() => parseOpenCodeEvents("not an event")).toThrow("non-JSON");
    expect(() => parseOpenCodeEvents('{"type":"step_finish"}')).toThrow("no narration");
  });
  test("rejects engagement bait, spoken direction tags, and disconnected openings", () => {
    validateDraft(draft(), 60);
    const bait = draft(); bait.beats[1]!.text += " You won't believe what happened next.";
    expect(() => validateDraft(bait, 60)).toThrow("engagement bait");
    const tags = draft(); tags.beats[1]!.text += " [sad]";
    expect(() => validateDraft(tags, 60)).toThrow("performance tags");
    const mismatch = draft(); mismatch.selectedHook = 1;
    expect(() => validateDraft(mismatch, 60)).toThrow("selected hook");
  });
  test("saves reviewed text, reuses matching cache, invalidates changed source, and preserves prior good output on rejection", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "story-test-"));
    let calls = 0;
    const generate = async () => { calls++; return JSON.stringify(calls % 2 ? draft() : { approved: true, issues: [], draft: draft() }); };
    try {
      const first = await editStory(source, { directory, targetSeconds: 60, generate });
      expect(calls).toBe(2);
      expect(first.narration).not.toContain("Quiet disbelief");
      await editStory(source, { directory, targetSeconds: 60, generate });
      expect(calls).toBe(2);
      await editStory({ ...source, title: "Different source title" }, { directory, targetSeconds: 60, generate });
      expect(calls).toBe(4);
      const saved = await readFile(path.join(directory, `${source.name}.json`), "utf8");
      let rejectedCalls = 0;
      await expect(editStory(source, { directory, targetSeconds: 60, force: true, generate: async () => JSON.stringify(++rejectedCalls === 1 ? draft() : { approved: false, issues: ["Missing supported ending"], draft: draft() }) })).rejects.toThrow("Missing supported ending");
      expect(await readFile(path.join(directory, `${source.name}.json`), "utf8")).toBe(saved);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  test("rejects path traversal and invalid duration before requesting a model", async () => {
    await expect(editStory({ ...source, name: "../escape" })).rejects.toThrow("safe name");
    await expect(editStory(source, { targetSeconds: NaN })).rejects.toThrow("duration");
  });
});
