import { describe, expect, it } from "vitest";
import { type Mistake, MistakeKind, TestMistake } from "./mistake.js";

describe("TestMistake", () => {
  it.each<[Mistake, string]>([
    [
      { kind: MistakeKind.UnknownStep, step: "chrage" },
      "the workflow has no step chrage",
    ],
    [
      { kind: MistakeKind.StepScriptedTwice, step: "charge" },
      "charge is scripted twice",
    ],
    [
      { kind: MistakeKind.RescueStepSkips, step: "charge_rescue" },
      "charge_rescue is a rescue step, which cannot skip",
    ],
    [
      { kind: MistakeKind.NoContributor, step: "charge" },
      "charge declares no contributor, so it cannot contribute",
    ],
    [
      { kind: MistakeKind.NoReporter, step: "charge" },
      "charge declares no reporter, so it cannot emit or set global metadata",
    ],
    [
      { kind: MistakeKind.StepLeftOut, step: "ship" },
      "ship is left out, though every step must be scripted",
    ],
    [
      { kind: MistakeKind.GapInTheAttempts, step: "charge", attempt: 3 },
      "attempt 3 of charge is described before the attempt before it",
    ],
    [
      { kind: MistakeKind.AttemptScriptedTwice, step: "charge", attempt: 1 },
      "attempt 1 of charge is described twice",
    ],
    [
      { kind: MistakeKind.NoSuchAttempt, step: "charge", attempt: 4 },
      "charge can have no attempt 4",
    ],
    [
      { kind: MistakeKind.AttemptLeftOut, step: "charge", attempt: 2 },
      "attempt 2 of charge is left out",
    ],
    [
      {
        kind: MistakeKind.RescueStepLeftOut,
        step: "charge_rescue",
        rescued: "charge",
      },
      "charge_rescue is left out, though charge can fail on attempt 1",
    ],
    [
      { kind: MistakeKind.UnknownProvider, provider: "gateway" },
      "the workflow has no service provider gateway",
    ],
    [
      { kind: MistakeKind.AnotherService, provider: "gateway" },
      "the fake of gateway makes another service than the provider",
    ],
  ])("names a mistake of kind %o in its message", (mistake, described) => {
    expect(new TestMistake([mistake]).message).toBe(
      `the test is mistaken: ${described}`,
    );
  });

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
