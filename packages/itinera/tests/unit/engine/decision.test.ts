import { describe, expect, it } from "vitest";
import { Attempt, type StepDescriptor } from "../../../src/step.js";
import { nextAttempt } from "../../../src/step/attempt.js";
import { describeStep } from "../../../src/step/descriptor.js";
import { Charge } from "../../fixtures/step.js";
import {
  type AfterAbnormalTermination,
  afterAbnormalTermination,
} from "../../../src/engine/decision.js";

function step(
  retryBudget: number,
  retryOnAbnormalTermination: boolean,
): StepDescriptor {
  return describeStep(Charge, {
    name: "charge",
    retryBudget,
    noRetryOnAbnormalTermination: !retryOnAbnormalTermination,
  });
}

const second = nextAttempt(Attempt.first);

describe("afterAbnormalTermination", () => {
  it.each<[string, StepDescriptor, Attempt, AfterAbnormalTermination]>([
    [
      "a first attempt with retries left",
      step(1, true),
      Attempt.first,
      { kind: "retry" },
    ],
    [
      "a step with no retry budget",
      step(0, true),
      Attempt.first,
      { kind: "give up", cause: "abnormal termination" },
    ],
    [
      "a step that never retries abnormal terminations",
      step(3, false),
      Attempt.first,
      { kind: "give up", cause: "abnormal termination" },
    ],
    [
      "the last attempt the budget allows",
      step(1, true),
      second,
      { kind: "give up", cause: "retries exhausted" },
    ],
  ])(
    "decides as the retry budget says, for %s",
    (_, described, attempt, decided) => {
      expect(afterAbnormalTermination(described, attempt)).toEqual(decided);
    },
  );
});
