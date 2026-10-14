import { expect, test } from "bun:test";
import { EXPRESSIONS, validateAudition } from "../../src/story/audition";

function fixture() {
  return { title: "A performance test", beats: Array.from({ length: 20 }, (_, i) => ({
    role: "audition", expression: EXPRESSIONS[i % EXPRESSIONS.length], direction: "Quiet and grounded",
    text: "I thought the envelope was empty until I held it near the window and saw a folded note tucked beneath the lining by accident.", pauseAfterMs: 500,
  })) };
}
test("audition covers every expression with enough material for a long comparison", () => {
  expect(validateAudition(fixture())).toBeGreaterThanOrEqual(450);
  const missing = fixture(); missing.beats = missing.beats.map(b => ({ ...b, expression: "warmth" }));
  expect(() => validateAudition(missing)).toThrow("all ten");
});
test("spoken performance labels and oversized utterances fail before synthesis", () => {
  const tagged = fixture(); tagged.beats[0]!.text += " [laugh]";
  expect(() => validateAudition(tagged)).toThrow("without direction tags");
  const oversized = fixture(); oversized.beats[0]!.text = "word ".repeat(46);
  expect(() => validateAudition(oversized)).toThrow("forty-five");
});
