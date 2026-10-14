import { expect, test } from "bun:test";
import { AsyncQueue } from "../../src/utils";

test("invalid concurrency fails before starting media jobs", async () => {
  const queue = new AsyncQueue();
  let started = false;
  await queue.add(async () => { started = true; });
  await expect(queue.run({concurrency: 0})).rejects.toThrow("positive integer");
  await expect(queue.run({concurrency: NaN})).rejects.toThrow("positive integer");
  expect(started).toBe(false);
});
