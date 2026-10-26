import { describe, expect, it } from "vitest";
import { integer } from "../../../src/value/token.js";
import { Level } from "../../../src/testing/emitted.js";
import {
  Contributions,
  HookEventReporter,
  StepEventReporter,
} from "../../../src/testing/recorders.js";

describe("Contributions", () => {
  it("keeps the keys contributed under, in the order first contributed, and reads the last value of each", () => {
    const contributions = new Contributions();
    contributions.contributor.contribute("charged", 40);
    contributions.contributor.contribute("receipt", "R-1");
    contributions.contributor.contribute("charged", 35);
    expect(contributions.keys()).toEqual(["charged", "receipt"]);
    expect(contributions.read("charged", integer).option().unwrap()).toBe(35);
  });

  it("reads a key never contributed under as absent", () => {
    expect(new Contributions().read("charged", integer).kind).toBe("absent");
  });
});

describe.each([
  ["StepEventReporter", StepEventReporter],
  ["HookEventReporter", HookEventReporter],
])("%s", (_, Recorder) => {
  it("keeps every event emitted and the global metadata set", async () => {
    const recorder = new Recorder();
    await recorder.reporter.info("charged");
    await recorder.reporter.setGlobalMetadata("tenant", "acme");
    expect(recorder.emitted).toMatchObject([
      { level: Level.Info, message: "charged" },
    ]);
    expect([...recorder.globalMetadata]).toEqual([["tenant", "acme"]]);
  });

  it("interrupts every call and keeps nothing once made failing", async () => {
    const recorder = Recorder.failing();
    await expect(recorder.reporter.info("charged")).rejects.toThrow();
    expect(recorder.emitted).toEqual([]);
  });
});
