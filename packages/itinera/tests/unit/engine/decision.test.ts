import { describe, expect, it } from "vitest";
import { RetryCause } from "../../../src/policy.js";
import { Attempt, type StepDescriptor } from "../../../src/step.js";
import { nextAttempt } from "../../../src/step/attempt.js";
import { describeStep, rescueOf } from "../../../src/step/descriptor.js";
import { Charge, Refund } from "../../fixtures/step.js";
import {
  type AfterFailedAttempt,
  afterFailedAttempt,
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

function rescued(retryOnAbnormalTermination: boolean): StepDescriptor {
  return describeStep(Charge, {
    name: "charge",
    noRetryOnAbnormalTermination: !retryOnAbnormalTermination,
    rescue: { step: Refund, requests: { needs: [], run: [] } },
  });
}

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

  it.each([
    ["a failure", true, RetryCause.Failure],
    ["an abnormal termination", true, RetryCause.AbnormalTermination],
    [
      "an abnormal termination of a step that never retries those",
      false,
      RetryCause.AbnormalTermination,
    ],
  ])(
    "hands the first attempt of a step with a rescue step to its rescue step, after %s",
    (_, retryOnAbnormalTermination, cause) => {
      const described = rescued(retryOnAbnormalTermination);
      expect(afterFailedAttempt(described, Attempt.first, cause)).toEqual({
        kind: "rescue",
        rescue: rescueOf(described),
      });
    },
  );

  it.each([
    ["a failure", RetryCause.Failure, "failure"],
    [
      "an abnormal termination",
      RetryCause.AbnormalTermination,
      "abnormal termination",
    ],
  ])(
    "gives a rescued step up after %s of the attempt that follows its rescue",
    (_, cause, givenUpFor) => {
      expect(afterFailedAttempt(rescued(true), second, cause)).toEqual({
        kind: "give up",
        cause: givenUpFor,
      });
    },
  );
});
