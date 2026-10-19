import { describe, expect, it } from "vitest";
import { Attempt, type StepDescriptor, type StepName } from "../step.js";
import { nextAttempt } from "../step/attempt.js";
import {
  type AfterAbnormalTermination,
  afterAbnormalTermination,
} from "./decision.js";

function step(
  retryBudget: number,
  retryOnAbnormalTermination: boolean,
): StepDescriptor {
  return {
    name: "charge" as StepName,
    retryBudget,
    retryOnAbnormalTermination,
    build: () => {
      throw new Error("never built");
    },
  };
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
