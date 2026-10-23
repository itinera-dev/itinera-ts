import { describe, expect, it } from "vitest";
import {
  type Mistake,
  MistakeKind,
  TestMistake,
} from "../../../src/testing/mistake.js";

describe("TestMistake", () => {
  it.each<{ mistake: Mistake; described: string }>([
    {
      mistake: { kind: MistakeKind.UnknownStep, step: "chrage" },
      described: "the workflow has no step chrage",
    },
    {
      mistake: { kind: MistakeKind.StepScriptedTwice, step: "charge" },
      described: "charge is scripted twice",
    },
    {
      mistake: { kind: MistakeKind.RescueStepSkips, step: "charge_rescue" },
      described: "charge_rescue is a rescue step, which cannot skip",
    },
    {
      mistake: { kind: MistakeKind.NoContributor, step: "charge" },
      described: "charge declares no contributor, so it cannot contribute",
    },
    {
      mistake: { kind: MistakeKind.NoReporter, step: "charge" },
      described:
        "charge declares no reporter, so it cannot emit or set global metadata",
    },
    {
      mistake: { kind: MistakeKind.StepLeftOut, step: "ship" },
      described: "ship is left out, though every step must be scripted",
    },
    {
      mistake: {
        kind: MistakeKind.GapInTheAttempts,
        step: "charge",
        attempt: 3,
      },
      described:
        "attempt 3 of charge is described before the attempt before it",
    },
    {
      mistake: {
        kind: MistakeKind.AttemptScriptedTwice,
        step: "charge",
        attempt: 1,
      },
      described: "attempt 1 of charge is described twice",
    },
    {
      mistake: { kind: MistakeKind.NoSuchAttempt, step: "charge", attempt: 4 },
      described: "charge can have no attempt 4",
    },
    {
      mistake: { kind: MistakeKind.AttemptLeftOut, step: "charge", attempt: 2 },
      described: "attempt 2 of charge is left out",
    },
    {
      mistake: {
        kind: MistakeKind.RescueStepLeftOut,
        step: "charge_rescue",
        rescued: "charge",
      },
      described:
        "charge_rescue is left out, though charge can fail on attempt 1",
    },
    {
      mistake: { kind: MistakeKind.UnknownProvider, provider: "gateway" },
      described: "the workflow has no service provider gateway",
    },
    {
      mistake: { kind: MistakeKind.AnotherService, provider: "gateway" },
      described: "the fake of gateway makes another service than the provider",
    },
  ])(
    "names a mistake of kind $mistake.kind in its message",
    ({ mistake, described }) => {
      expect(new TestMistake([mistake]).message).toBe(
        `the test is mistaken: ${described}`,
      );
    },
  );

  it("names every problem in its message, in order, and keeps them", () => {
    const problems: readonly [Mistake, ...Mistake[]] = [
      { kind: MistakeKind.StepLeftOut, step: "charge" },
      { kind: MistakeKind.StepLeftOut, step: "ship" },
    ];
    const mistake = new TestMistake(problems);
    expect(mistake.message).toBe(
      "the test is mistaken: charge is left out, though every step must be scripted; ship is left out, though every step must be scripted",
    );
    expect(mistake.problems).toEqual(problems);
    expect(Object.isFrozen(mistake.problems)).toBe(true);
  });

  it("is an error named TestMistake", () => {
    const mistake = new TestMistake([
      { kind: MistakeKind.UnknownStep, step: "chrage" },
    ]);
    expect([mistake instanceof Error, mistake.name]).toEqual([
      true,
      "TestMistake",
    ]);
  });
});
