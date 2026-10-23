import { describe, expect, it } from "vitest";
import type { Event } from "../../../../src/event.js";
import { aboutCharge, fixedFields } from "../../../fixtures/event.js";
import type { PolicyName } from "../../../../src/policy.js";
import { Attempt, nextAttempt, type StepName } from "../../../../src/step.js";
import { line } from "../../../../src/testing/recording-reporter/path.js";

const declined = { code: "declined" };
const fraudCheck = "fraud_check" as PolicyName;
const chargeRescue = "charge_rescue" as StepName;
const charge = "charge" as StepName;

describe("a journey's path", () => {
  it.each<[string, Event, string]>([
    [
      "a success",
      { kind: "step_succeeded", ...aboutCharge(2) },
      "charge attempt 1 succeeded",
    ],
    [
      "a failure, by its reason's code",
      {
        kind: "step_failed",
        ...aboutCharge(2),
        reason: { ...declined, message: "card declined", details: { a: 1 } },
      },
      "charge attempt 1 failed: declined",
    ],
    [
      "a skip without a reason",
      { kind: "step_skipped", ...aboutCharge(2) },
      "charge attempt 1 skipped",
    ],
    [
      "a skip with a reason",
      { kind: "step_skipped", ...aboutCharge(2), reason: { code: "empty" } },
      "charge attempt 1 skipped: empty",
    ],
    [
      "an abnormal termination, by the error's message",
      {
        kind: "step_abnormal_termination",
        ...aboutCharge(2, nextAttempt(nextAttempt(Attempt.first))),
        errorMessage: "timeout",
      },
      "charge attempt 3 terminated abnormally: timeout",
    ],
    [
      "a retry",
      {
        kind: "step_retrying",
        ...aboutCharge(3),
        cause: "failure",
        decidedBy: "default",
      },
      "charge retrying",
    ],
    [
      "a step given up by default, by its cause",
      {
        kind: "step_given_up",
        ...aboutCharge(3),
        cause: "retries exhausted",
        decidedBy: "default",
      },
      "charge given up: retries exhausted",
    ],
    [
      "a step given up by a hook, by the hook's policy",
      {
        kind: "step_given_up",
        ...aboutCharge(3),
        cause: "FailWorkflow",
        reason: declined,
        decidedBy: { policy: fraudCheck, hook: "on step retry" },
      },
      "charge given up: FailWorkflow from fraud_check",
    ],
    [
      "a rescue starting",
      {
        kind: "step_rescuing",
        ...aboutCharge(3),
        cause: "failure",
        rescue: chargeRescue,
        decidedBy: "default",
      },
      "charge rescuing with charge_rescue",
    ],
    [
      "a rescue that succeeded",
      {
        kind: "step_rescued",
        ...aboutCharge(5),
        rescue: chargeRescue,
        decidedBy: "default",
      },
      "charge rescued by charge_rescue",
    ],
    [
      "a journey that succeeded by default",
      { kind: "journey_succeeded", ...fixedFields(4), decidedBy: "default" },
      "journey succeeded",
    ],
    [
      "a journey that a hook finished",
      {
        kind: "journey_succeeded",
        ...fixedFields(4),
        decidedBy: {
          policy: "early_exit" as PolicyName,
          hook: "on step success",
        },
      },
      "journey succeeded, decided by early_exit",
    ],
    [
      "a journey that failed with a reason",
      {
        kind: "journey_failed",
        ...fixedFields(4),
        step: charge,
        cause: "failure",
        reason: declined,
        decidedBy: "default",
      },
      "journey failed at charge: declined",
    ],
    [
      "a journey that failed with an error",
      {
        kind: "journey_failed",
        ...fixedFields(4),
        step: charge,
        cause: "abnormal termination",
        errorMessage: "gateway down",
        decidedBy: "default",
      },
      "journey failed at charge: gateway down",
    ],
    [
      "a journey aborted during a step",
      {
        kind: "journey_aborted",
        ...fixedFields(4),
        abort: {
          reason: "step could not be built",
          step: charge,
          source: { kind: "step" },
          errorMessage: "no card",
        },
      },
      "journey aborted at charge: step could not be built",
    ],
    [
      "a journey aborted during no step",
      {
        kind: "journey_aborted",
        ...fixedFields(4),
        abort: { reason: "reporter failed", errorMessage: "disk full" },
      },
      "journey aborted: reporter failed",
    ],
  ])("writes %s as its line", (_, event, written) => {
    expect(line(event)).toBe(written);
  });

  it.each<[string, Event]>([
    [
      "the start of the journey",
      { kind: "journey_started", ...fixedFields(1), initialKeys: ["card"] },
    ],
    ["the start of an attempt", { kind: "attempt_started", ...aboutCharge(2) }],
    [
      "an event a step emits",
      { kind: "step_info", ...aboutCharge(2), message: "charging" },
    ],
  ])("has no line for %s, which is not part of the flow", (_, event) => {
    expect(line(event)).toBeUndefined();
  });
});
