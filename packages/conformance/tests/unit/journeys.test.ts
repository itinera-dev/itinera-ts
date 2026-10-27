import { LocalExecutor } from "itinera/executor";
import type { WorkflowInstance } from "itinera/instance";
import { describe, expect, it } from "vitest";
import { journeysOf } from "../../src/journeys.js";

function failingWith(error: Error): () => WorkflowInstance {
  return () => {
    throw error;
  };
}

describe("journeysOf", () => {
  it("stops at the TypeError that creating an instance fails with, and keeps it", async () => {
    const failure = new TypeError("not a journey ID");
    await expect(
      journeysOf(new LocalExecutor(), 2, failingWith(failure)),
    ).resolves.toEqual({ journeys: [], instanceFailure: failure });
  });

  it("lets any other error escape", async () => {
    await expect(
      journeysOf(new LocalExecutor(), 1, failingWith(new RangeError("bug"))),
    ).rejects.toThrow(RangeError);
  });
});
