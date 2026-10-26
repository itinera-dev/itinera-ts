import { describe, it } from "vitest";
import { HookEnding } from "../../../src/testing/hook-ending.js";
import { stepPolicyMock } from "../../../src/testing/step-policy-mock.js";

describe("stepPolicyMock", () => {
  it("lets only on step success finish the workflow", () => {
    stepPolicyMock({ onStepSuccess: HookEnding.finishWorkflow });
    // @ts-expect-error a failure hook cannot finish the workflow
    stepPolicyMock({ onStepFailure: HookEnding.finishWorkflow });
    // @ts-expect-error a failure hook cannot finish the workflow
    stepPolicyMock({ onStepRetry: HookEnding.finishWorkflow });
    // @ts-expect-error a failure hook cannot finish the workflow
    stepPolicyMock({ onStepAbnormalTermination: HookEnding.finishWorkflow });
  });

  it("refuses static data on a class extending it", () => {
    class Tracker extends stepPolicyMock({}) {
      static failures = 0;
    }
    // @ts-expect-error a step policy keeps no static data
    Tracker.builder();
  });
});
