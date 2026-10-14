import { describe, test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  VERSION,
  validateAnalysis,
  validateDraft,
  type Analysis,
  type Source,
  type Production,
  type MemoryFact,
} from "../../src/recap/schema";
import {
  emptyMemory,
  retrieve,
  memoryDelta,
  commitMemory,
  loadMemory,
} from "../../src/recap/memory";
import { hash, retryTransient } from "../../src/recap/io";
import { planTimeline } from "../../src/recap/timeline";
import { edit } from "../../src/recap/editor";
const episode = {
  showId: "test",
  id: "ep2",
  order: 2,
  continuity: "main",
  title: "The locked door",
};
const source: Source = {
  version: VERSION,
  episode,
  sourceHash: "abc",
  video: "/test.mp4",
  duration: 40,
};
const analysis: Analysis = {
  version: VERSION,
  episode,
  sourceHash: "abc",
  duration: 40,
  evidence: [
    {
      id: "e1",
      start: 0,
      end: 15,
      observation: "Mara finds a key.",
      kind: "observed",
      entities: ["Mara"],
      confidence: 0.9,
    },
    {
      id: "e2",
      start: 15,
      end: 35,
      observation: "Mara opens the door.",
      kind: "observed",
      entities: ["Mara"],
      confidence: 0.9,
    },
  ],
  events: [
    {
      id: "ev1",
      evidenceIds: ["e1"],
      description: "Finds key",
      requires: [],
      essential: true,
    },
    {
      id: "ev2",
      evidenceIds: ["e2"],
      description: "Opens door",
      requires: ["ev1"],
      essential: true,
    },
  ],
  warnings: [],
};
const draft = {
  title: "The key",
  beats: [
    {
      id: "b1",
      text: "Mara searches the empty room and finds a small key lying underneath the wooden table.",
      direction: "curious",
      pauseAfterMs: 100,
      eventIds: ["ev1"],
      evidenceIds: ["e1"],
      memoryIds: [],
    },
    {
      id: "b2",
      text: "She takes the key to the locked door and turns it carefully until the door opens.",
      direction: "relief",
      pauseAfterMs: 100,
      eventIds: ["ev2"],
      evidenceIds: ["e2"],
      memoryIds: [],
    },
  ],
  omittedEventIds: [],
};
function fact(
  id: string,
  order: number,
  statement: string,
  supersedes?: string,
): MemoryFact {
  return {
    id,
    episodeId: `ep${order}`,
    revealOrder: order,
    continuity: "main",
    statement,
    entities: ["Mara"],
    evidenceIds: ["source:e1"],
    kind: "observed",
    supersedes,
  };
}
function production(): Production {
  return {
    version: VERSION,
    fingerprint: "p",
    approvalHash: hash({ draft, analysis, context: [] }),
    sourceHash: "abc",
    episode,
    analysis,
    context: [],
    draft,
    review: { approved: true, issues: [] },
    model: "test",
    targetSeconds: 12,
  };
}
describe("episode evidence and narrative gates", () => {
  test("accepts grounded chronological draft", () => {
    validateAnalysis(analysis, source);
    validateDraft(draft, analysis, [], 12);
  });
  test("rejects wrong source, guessed ranges, cyclic dependencies", () => {
    expect(() =>
      validateAnalysis({ ...analysis, sourceHash: "wrong" }, source),
    ).toThrow("different source");
    expect(() =>
      validateAnalysis(
        { ...analysis, evidence: [{ ...analysis.evidence[0], end: 50 }] },
        source,
      ),
    ).toThrow("range");
    expect(() =>
      validateAnalysis(
        {
          ...analysis,
          events: [
            { ...analysis.events[0], requires: ["ev2"] },
            analysis.events[1],
          ],
        },
        source,
      ),
    ).toThrow("Cyclic");
  });
  test("rejects future memory, missing causes, and unrelated footage", () => {
    expect(() =>
      validateDraft(
        {
          ...draft,
          beats: [{ ...draft.beats[0], memoryIds: ["future"] }, draft.beats[1]],
        },
        analysis,
        [],
        12,
      ),
    ).toThrow("memory");
    expect(() =>
      validateDraft(
        { ...draft, beats: [draft.beats[1], draft.beats[0]] },
        analysis,
        [],
        12,
      ),
    ).toThrow("prerequisite");
    expect(() =>
      validateDraft(
        {
          ...draft,
          beats: [{ ...draft.beats[0], evidenceIds: ["e2"] }, draft.beats[1]],
        },
        analysis,
        [],
        12,
      ),
    ).toThrow("unrelated");
  });
  test("fits measured voice with distinct source ranges and fails on insufficient footage", () => {
    const audio = draft.beats.map((b) => ({
      id: b.id,
      file: `/${b.id}.mp3`,
      duration: 8,
      text: b.text,
    }));
    const t = planTimeline(source, production(), audio);
    expect(t.duration).toBe(16);
    expect(t.segments[1]!.sourceStart).toBe(15);
    expect(() =>
      planTimeline(
        source,
        production(),
        audio.map((b) => ({ ...b, duration: 30 })),
      ),
    ).toThrow("will not loop");
  });
});
describe("show continuity", () => {
  test("future correction does not erase an earlier fact; same-episode facts stay outside setup", () => {
    const facts = [
      fact("old", 1, "Mara believes her brother is dead."),
      fact("future", 3, "Her brother survived.", "old"),
      fact("current", 2, "The key opens a door."),
    ];
    const m = { ...emptyMemory("test"), facts, revision: hash(facts) };
    expect(retrieve(m, episode, ["Mara"]).map((f) => f.id)).toEqual(["old"]);
    expect(
      retrieve(m, { ...episode, id: "ep4", order: 4 }, ["Mara"]).map(
        (f) => f.id,
      ),
    ).toEqual(["current", "future"]);
    expect(
      retrieve(m, { ...episode, continuity: "alternate" }, ["Mara"]),
    ).toEqual([]);
  });
  test("requires unchanged parent revision and persists immutable facts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "recap-memory-"));
    const file = path.join(dir, "memory.json");
    try {
      const initial = emptyMemory("test");
      const delta = memoryDelta(analysis, initial);
      await commitMemory(file, delta);
      expect((await loadMemory(file, "test")).facts).toHaveLength(2);
      await expect(commitMemory(file, delta)).rejects.toThrow("Stale");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
test("editor independently reviews supplied drafts and refuses unsupported approval", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "recap-editor-"));
  try {
    let calls = 0;
    const p = await edit(analysis, [], dir, 12, {
      generate: async () =>
        ++calls === 1
          ? JSON.stringify(draft)
          : JSON.stringify({ approved: true, issues: [] }),
    });
    expect(p.review.approved).toBe(true);
    expect(calls).toBe(2);
    await expect(
      edit(analysis, [], dir, 13, {
        generate: async (prompt) =>
          prompt.startsWith("Review")
            ? JSON.stringify({ approved: false, issues: ["unsupported claim"] })
            : JSON.stringify(draft),
      }),
    ).rejects.toThrow("unsupported claim");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("analysis retries only transient status codes and remains bounded", async () => {
  let calls = 0;
  expect(
    await retryTransient(
      async () => {
        if (++calls < 3) throw { status: 503 };
        return "ok";
      },
      async () => {},
    ),
  ).toBe("ok");
  expect(calls).toBe(3);
  calls = 0;
  await expect(
    retryTransient(
      async () => {
        calls++;
        throw { status: 401 };
      },
      async () => {},
    ),
  ).rejects.toEqual({ status: 401 });
  expect(calls).toBe(1);
});
