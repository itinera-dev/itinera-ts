import { describe, it } from "vitest";
import { HookEnding } from "./hook-ending.js";
import { stepPolicyMock } from "./step-policy-mock.js";

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
});
