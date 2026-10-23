import { describe, expect, it } from "vitest";
import { WorkflowHook } from "../../../src/policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import { HookEnding } from "../../../src/testing/hook-ending.js";
import {
  WorkflowPolicyMock,
  type WorkflowPolicyMockScript,
  workflowPolicyMock,
} from "../../../src/testing/workflow-policy-mock.js";

/** A workflow policy mock whose hooks end as `script` says. */
function made(script: WorkflowPolicyMockScript = {}): WorkflowPolicyMock {
  return new (workflowPolicyMock(script))();
}

/** What calling the hook `hook` of `mock` with `received` gives, or throws. */
function called(
  mock: WorkflowPolicyMock,
  hook: WorkflowHook,
  ...received: unknown[]
): unknown {
  try {
    switch (hook) {
      case WorkflowHook.OnWorkflowSuccess:
        return mock.onWorkflowSuccess(...received);
      case WorkflowHook.OnWorkflowFailure:
        return mock.onWorkflowFailure(...received);
    }
  } catch (error) {
    return error;
  }
}

describe("workflowPolicyMock", () => {
  it("makes a class extending WorkflowPolicyMock and WorkflowPolicy", () => {
    const mock = made();
    expect([
      mock instanceof WorkflowPolicyMock,
      mock instanceof WorkflowPolicy,
    ]).toEqual([true, true]);
  });

  it("keeps every call of its hooks, with what each received, in order", () => {
    const mock = made();
    called(mock, WorkflowHook.OnWorkflowFailure, "J-1");
    called(mock, WorkflowHook.OnWorkflowSuccess);
    expect(mock.calls).toEqual([
      { hook: "on workflow failure", received: ["J-1"] },
      { hook: "on workflow success", received: [] },
    ]);
  });

  it("gives its calls as a list of their own", () => {
    const mock = made();
    expect(mock.calls).not.toBe(mock.calls);
  });

  it("returns nothing from every hook its script leaves out or says keeps the default", () => {
    const mock = made({ onWorkflowSuccess: HookEnding.keepDefault });
    for (const hook of WorkflowHook.values) {
      expect(called(mock, hook)).toBeUndefined();
    }
  });

  it("throws an error with the message from every hook its script says fails", () => {
    const fails = HookEnding.fail("ledger down");
    const mock = made({ onWorkflowSuccess: fails, onWorkflowFailure: fails });
    for (const hook of WorkflowHook.values) {
      expect(called(mock, hook)).toEqual(new Error("ledger down"));
    }
  });

  it("cannot be built when its script says so", () => {
    const Audit = workflowPolicyMock({ buildFailure: "no ledger" });
    expect(() => new Audit()).toThrow("no ledger");
  });
});
