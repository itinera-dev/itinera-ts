import { MistakeKind, TestMistake } from "itinera/testing";
import { describe, expect, it } from "vitest";
import { Tested } from "./tested.js";
import { Unmet } from "./unmet.js";

const mistake = new TestMistake([
  { kind: MistakeKind.UnknownStep, step: "chrage" },
]);

async function throwing(error: Error): Promise<void> {
  return Promise.reject(error);
}

describe("Tested", () => {
  it("keeps the test mistake that stops what it awaits", async () => {
    const tested = new Tested();
    await tested.caught(() => throwing(mistake));
    expect(tested.mistake).toBe(mistake);
  });

  it("lets any other error through", async () => {
    const error = new Error("gateway down");
    await expect(new Tested().caught(() => throwing(error))).rejects.toBe(
      error,
    );
  });

  it.each([
    ["the mistake", (tested: Tested) => tested.mistake],
    ["the scripted run's record", (tested: Tested) => tested.scriptedRun],
  ])("finds %s unmet when there is none", (_, reading) => {
    expect(() => reading(new Tested())).toThrow(Unmet);
  });
});
