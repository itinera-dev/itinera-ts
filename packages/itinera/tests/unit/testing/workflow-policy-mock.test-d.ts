import { describe, it } from "vitest";
import { HookEnding } from "../../../src/testing/hook-ending.js";
import { workflowPolicyMock } from "../../../src/testing/workflow-policy-mock.js";

describe("workflowPolicyMock", () => {
  it("lets a workflow hook neither finish nor fail the workflow", () => {
    workflowPolicyMock({ onWorkflowFailure: HookEnding.fail("audit failed") });
    // @ts-expect-error a workflow hook returns no lifecycle
    workflowPolicyMock({ onWorkflowSuccess: HookEnding.finishWorkflow });
    // @ts-expect-error a workflow hook returns no lifecycle
    workflowPolicyMock({ onWorkflowFailure: HookEnding.failWorkflow("late") });
  });
});
