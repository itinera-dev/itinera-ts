import { describe, expect, it } from "vitest";
import { failureCause, retryCause } from "../../../../src/policy/request.js";
import { Ending } from "../../../../src/testing/ending.js";
import { HookEnding } from "../../../../src/testing/hook-ending.js";
import { rescueStepMock } from "../../../../src/testing/rescue-step-mock.js";
import { stepMock } from "../../../../src/testing/step-mock.js";
import type { StepPolicyMock } from "../../../../src/testing/step-policy-mock.js";
import { alarm, callsOf, orders, recorded, run, kindOf } from "../../../fixtures/engine.js";

const declined = Ending.failure("declined");
const crashed = Ending.abnormalTermination("timeout");

/** A step `charge` whose attempts end as `attempts` says, with a retry budget. */
function chargeWith(retryBudget: number, ...attempts: [Ending, ...Ending[]]) {
  return stepMock({ attempts }).builder("charge").retryBudget(retryBudget);
}

/** A step `charge` whose attempts end as `attempts` says, rescued by a rescue step that succeeds. */
function rescuedCharge(...attempts: [Ending, ...Ending[]]) {
  return stepMock({ attempts })
    .builder("charge")
    .rescue(rescueStepMock({ attempts: [Ending.success] }).builder());
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

describe("decided, for a step with a rescue step", () => {
  it.each<[string, Ending, string, readonly string[]]>([
    ["a failure", declined, "failure", []],
    [
      "an abnormal termination",
      crashed,
      "abnormal termination",
      ["on step abnormal termination"],
    ],
  ])(
    "hands the first attempt to the rescue step after %s, calling neither on step retry nor on step failure",
    async (_, ending, cause, hooks) => {
      const built: StepPolicyMock[] = [];
      const watched = alarm(built)
        .onStepAbnormalTermination("onStepAbnormalTermination")
        .onStepRetry("onStepRetry")
        .onStepFailure("onStepFailure");
      const recorder = await recorded(
        orders(rescuedCharge(ending, Ending.success).policy(watched)),
      );
      expect(callsOf(built).map(hookOf)).toEqual(hooks);
      expect(recorder.events.find(isRescuing)).toMatchObject({
        step: "charge",
        cause,
        rescue: "charge_rescue",
        decidedBy: "default",
      });
    },
  );

  it("rescues an abnormal termination of a step that never retries those", async () => {
    const recorder = await recorded(
      orders(
        rescuedCharge(crashed, Ending.success).noRetryOnAbnormalTermination(),
      ),
    );
    expect(recorder.path).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge rescuing with charge_rescue",
      "charge_rescue attempt 1 succeeded",
      "charge rescued by charge_rescue",
      "charge attempt 2 succeeded",
      "journey succeeded",
    ]);
  });

  it("gives the step up instead of rescuing it when on step abnormal termination fails the workflow", async () => {
    const watched = alarm([], {
      onStepAbnormalTermination: HookEnding.failWorkflow("stop"),
    }).onStepAbnormalTermination("onStepAbnormalTermination");
    const recorder = await recorded(
      orders(rescuedCharge(crashed).policy(watched)),
    );
    expect(recorder.path).toEqual([
      "charge attempt 1 terminated abnormally: timeout",
      "charge given up: FailWorkflow from alarm",
      "journey failed at charge: stop",
    ]);
  });

  it("gives the step up after the attempt that follows its rescue, calling on step failure once, and never rescues it twice", async () => {
    const built: StepPolicyMock[] = [];
    const watched = alarm(built).onStepFailure("onStepFailure", failureCause());
    const recorder = await recorded(
      orders(rescuedCharge(declined, Ending.failure("again")).policy(watched)),
    );
    expect(recorder.path).toEqual([
      "charge attempt 1 failed: declined",
      "charge rescuing with charge_rescue",
      "charge_rescue attempt 1 succeeded",
      "charge rescued by charge_rescue",
      "charge attempt 2 failed: again",
      "charge given up: failure",
      "journey failed at charge: again",
    ]);
    expect(callsOf(built)).toEqual([
      { hook: "on step failure", received: ["failure"] },
    ]);
  });
});

function hookOf({ hook }: { readonly hook: string }): string {
  return hook;
}

function isRescuing({ kind }: { readonly kind: string }): boolean {
  return kind === "step_rescuing";
}
