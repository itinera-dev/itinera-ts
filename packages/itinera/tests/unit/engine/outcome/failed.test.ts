import { describe, expect, it } from "vitest";
import { failureCause, retryCause } from "../../../../src/policy/request.js";
import { Ending } from "../../../../src/testing/ending.js";
import { HookEnding } from "../../../../src/testing/hook-ending.js";
import { stepMock } from "../../../../src/testing/step-mock.js";
import type { StepPolicyMock } from "../../../../src/testing/step-policy-mock.js";
import {
  alarm,
  callsOf,
  orders,
  recorded,
  run,
  kindOf,
} from "../../../fixtures/engine.js";

const declined = Ending.failure("declined");
const crashed = Ending.abnormalTermination("timeout");

/** A step `charge` whose attempts end as `attempts` says, with a retry budget. */
function chargeWith(retryBudget: number, ...attempts: [Ending, ...Ending[]]) {
  return stepMock({ attempts }).builder("charge").retryBudget(retryBudget);
}

describe("decided", () => {
  it("calls on step retry before step_retrying, and retries when it keeps the default", async () => {
    const watched = alarm().onStepRetry("onStepRetry");
    const recorder = await recorded(
      orders(chargeWith(1, declined, Ending.success).policy(watched)),
    );
    expect(recorder.events.slice(2, 5).map(kindOf)).toEqual([
      "step_failed",
      "hook_called",
      "step_retrying",
    ]);
    expect(recorder.path).toEqual([
      "charge attempt 1 failed: declined",
      "charge retrying",
      "charge attempt 2 succeeded",
      "journey succeeded",
    ]);
  });

  it.each([
    ["a failure", declined, "failure"],
    ["an abnormal termination", crashed, "abnormal termination"],
  ])(
    "gives on step retry, after %s, the cause of the retry",
    async (_, ending, cause) => {
      const built: StepPolicyMock[] = [];
      const watched = alarm(built).onStepRetry("onStepRetry", retryCause());
      await run(
        orders(
          chargeWith(1, ending, Ending.success).policy(watched),
        ).instance(),
      );
      expect(callsOf(built)).toEqual([
        { hook: "on step retry", received: [cause] },
      ]);
    },
  );

  it("gives the step up, decided by the hook, without calling on step failure, when on step retry fails the workflow", async () => {
    const built: StepPolicyMock[] = [];
    const watched = alarm(built, {
      onStepRetry: HookEnding.failWorkflow("unstable"),
    })
      .onStepRetry("onStepRetry")
      .onStepFailure("onStepFailure");
    const workflow = orders(chargeWith(3, declined).policy(watched));
    const recorder = await recorded(workflow);
    expect(recorder.path).toEqual([
      "charge attempt 1 failed: declined",
      "charge given up: FailWorkflow from alarm",
      "journey failed at charge: unstable",
    ]);
    const decidedBy = { policy: "alarm", hook: "on step retry" };
    expect(recorder.events.slice(-2)).toMatchObject([
      {
        kind: "step_given_up",
        cause: "FailWorkflow",
        reason: { code: "unstable" },
        decidedBy,
      },
      { kind: "journey_failed", cause: "FailWorkflow", decidedBy },
    ]);
    expect(callsOf(built)).toEqual([{ hook: "on step retry", received: [] }]);
    expect((await run(workflow.instance())).failure).toEqual({
      cause: "FailWorkflow",
      reason: { code: "unstable" },
    });
  });

  it("calls on step failure once the step is given up, and fails the journey by the executor's own rule when it keeps the default", async () => {
    const watched = alarm().onStepFailure("onStepFailure");
    const workflow = orders(chargeWith(0, declined).policy(watched));
    const recorder = await recorded(workflow);
    expect(recorder.events.slice(2).map(kindOf)).toEqual([
      "step_failed",
      "step_given_up",
      "hook_called",
      "journey_failed",
    ]);
    expect((await run(workflow.instance())).failure).toEqual({
      cause: "failure",
      reason: { code: "declined" },
    });
  });

  it.each([
    ["a failure with no retry budget", chargeWith(0, declined), "failure"],
    [
      "failures that spent the retry budget",
      chargeWith(1, declined),
      "retries exhausted",
    ],
    [
      "an abnormal termination with no retry budget",
      chargeWith(0, crashed),
      "abnormal termination",
    ],
    [
      "abnormal terminations that spent the retry budget",
      chargeWith(1, crashed),
      "retries exhausted",
    ],
  ])(
    "gives on step failure, after %s, the cause its step was given up for",
    async (_, step, cause) => {
      const built: StepPolicyMock[] = [];
      const watched = alarm(built).onStepFailure(
        "onStepFailure",
        failureCause(),
      );
      await run(orders(step.policy(watched)).instance());
      expect(callsOf(built)).toEqual([
        { hook: "on step failure", received: [cause] },
      ]);
    },
  );

  it("fails the journey for the hook's reason, decided by the hook, when on step failure fails the workflow, the step given up by the executor's own rule", async () => {
    const watched = alarm([], {
      onStepFailure: HookEnding.failWorkflow("fraud"),
    }).onStepFailure("onStepFailure");
    const workflow = orders(chargeWith(0, declined).policy(watched));
    const recorder = await recorded(workflow);
    expect(recorder.path).toEqual([
      "charge attempt 1 failed: declined",
      "charge given up: failure",
      "journey failed at charge: fraud",
    ]);
    expect(recorder.events.at(-1)).toMatchObject({
      kind: "journey_failed",
      cause: "FailWorkflow",
      reason: { code: "fraud" },
      decidedBy: { policy: "alarm", hook: "on step failure" },
    });
    expect((await run(workflow.instance())).failure).toEqual({
      cause: "FailWorkflow",
      reason: { code: "fraud" },
    });
  });
});
