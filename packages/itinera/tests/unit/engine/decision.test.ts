import { describe, expect, it } from "vitest";
import { RetryCause } from "../../../src/policy.js";
import { Attempt, type StepDescriptor } from "../../../src/step.js";
import { nextAttempt } from "../../../src/step/attempt.js";
import { describeStep } from "../../../src/step/descriptor.js";
import { Charge } from "../../fixtures/step.js";
import { type AfterFailedAttempt, afterFailedAttempt } from "../../../src/engine/decision.js";

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

describe("afterFailedAttempt", () => {
  it.each<[string, StepDescriptor, Attempt, RetryCause, AfterFailedAttempt]>([
    [
      "a failure with retries left",
      step(1, true),
      Attempt.first,
      RetryCause.Failure,
      { kind: "retry" },
    ],
    [
      "an abnormal termination with retries left",
      step(1, true),
      Attempt.first,
      RetryCause.AbnormalTermination,
      { kind: "retry" },
    ],
    [
      "a failure of a step with no retry budget",
      step(0, true),
      Attempt.first,
      RetryCause.Failure,
      { kind: "give up", cause: "failure" },
    ],
    [
      "an abnormal termination of a step with no retry budget",
      step(0, true),
      Attempt.first,
      RetryCause.AbnormalTermination,
      { kind: "give up", cause: "abnormal termination" },
    ],
    [
      "an abnormal termination of a step that never retries those",
      step(3, false),
      Attempt.first,
      RetryCause.AbnormalTermination,
      { kind: "give up", cause: "abnormal termination" },
    ],
    [
      "a failure of a step that never retries abnormal terminations",
      step(3, false),
      Attempt.first,
      RetryCause.Failure,
      { kind: "retry" },
    ],
    [
      "a failure on the last attempt the budget allows",
      step(1, true),
      second,
      RetryCause.Failure,
      { kind: "give up", cause: "retries exhausted" },
    ],
    [
      "an abnormal termination on the last attempt the budget allows",
      step(1, true),
      second,
      RetryCause.AbnormalTermination,
      { kind: "give up", cause: "retries exhausted" },
    ],
  ])(
    "decides as the retry budget says, for %s",
    (_, described, attempt, cause, decided) => {
      expect(afterFailedAttempt(described, attempt, cause)).toEqual(decided);
    },
  );
});
