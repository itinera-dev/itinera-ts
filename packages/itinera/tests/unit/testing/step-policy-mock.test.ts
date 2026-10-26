import { describe, expect, it } from "vitest";
import { StepHook } from "../../../src/policy.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { HookEnding } from "../../../src/testing/hook-ending.js";
import {
  StepPolicyMock,
  type StepPolicyMockScript,
  stepPolicyMock,
} from "../../../src/testing/step-policy-mock.js";

/** A step policy mock whose hooks end as `script` says. */
function made(script: StepPolicyMockScript = {}): StepPolicyMock {
  return new (stepPolicyMock(script))();
}

/** What calling the hook `hook` of `mock` with `received` gives, or throws. */
function called(
  mock: StepPolicyMock,
  hook: StepHook,
  ...received: unknown[]
): unknown {
  try {
    switch (hook) {
      case StepHook.OnStepSuccess:
        return mock.onStepSuccess(...received);
      case StepHook.OnStepFailure:
        return mock.onStepFailure(...received);
      case StepHook.OnStepRetry:
        return mock.onStepRetry(...received);
      case StepHook.OnStepAbnormalTermination:
        return mock.onStepAbnormalTermination(...received);
    }
  } catch (error) {
    return error;
  }
}

const failing = HookEnding.failWorkflow("fraud");
const failed = { kind: "FailWorkflow", reason: { code: "fraud" } };

describe("stepPolicyMock", () => {
  it("makes a class extending StepPolicyMock and StepPolicy", () => {
    const mock = made();
    expect([
      mock instanceof StepPolicyMock,
      mock instanceof StepPolicy,
    ]).toEqual([true, true]);
  });

  it("keeps every call of its hooks, with what each received, in order", () => {
    const mock = made();
    called(mock, StepHook.OnStepRetry, "failure", 2);
    called(mock, StepHook.OnStepFailure, "retries exhausted");
    expect(mock.calls).toEqual([
      { hook: "on step retry", received: ["failure", 2] },
      { hook: "on step failure", received: ["retries exhausted"] },
    ]);
  });

  it("gives its calls as a list of their own", () => {
    const mock = made();
    expect(mock.calls).not.toBe(mock.calls);
  });

  it("keeps the default in every hook its script leaves out", () => {
    for (const hook of StepHook.values) {
      expect(called(made(), hook)).toEqual({ kind: "KeepDefault" });
    }
  });

  it.each<[string, StepPolicyMockScript, StepHook, unknown]>([
    [
      "on step success finishing the workflow",
      { onStepSuccess: HookEnding.finishWorkflow },
      StepHook.OnStepSuccess,
      { kind: "FinishWorkflow" },
    ],
    [
      "on step success keeping the default",
      { onStepSuccess: HookEnding.keepDefault },
      StepHook.OnStepSuccess,
      { kind: "KeepDefault" },
    ],
    [
      "on step success failing the workflow",
      { onStepSuccess: failing },
      StepHook.OnStepSuccess,
      failed,
    ],
    [
      "on step failure failing the workflow",
      { onStepFailure: failing },
      StepHook.OnStepFailure,
      failed,
    ],
    [
      "on step retry failing the workflow",
      { onStepRetry: failing },
      StepHook.OnStepRetry,
      failed,
    ],
    [
      "on step abnormal termination failing the workflow",
      { onStepAbnormalTermination: failing },
      StepHook.OnStepAbnormalTermination,
      failed,
    ],
  ])("plays the ending its script gives, %s", (_, script, hook, expected) => {
    expect(called(made(script), hook)).toEqual(expected);
  });

  it("throws an error with the message from every hook its script says fails", () => {
    const fails = HookEnding.fail("ledger down");
    const mock = made({
      onStepSuccess: fails,
      onStepFailure: fails,
      onStepRetry: fails,
      onStepAbnormalTermination: fails,
    });
    for (const hook of StepHook.values) {
      expect(called(mock, hook)).toEqual(new Error("ledger down"));
    }
  });

  it("cannot be built when its script says so", () => {
    const Alarm = stepPolicyMock({ buildFailure: "no ledger" });
    expect(() => new Alarm()).toThrow("no ledger");
  });
});
