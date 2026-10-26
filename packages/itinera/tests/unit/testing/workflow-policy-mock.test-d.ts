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

  it("refuses static data on a class extending it", () => {
    class Census extends workflowPolicyMock({}) {
      static journeys = 0;
    }
    // @ts-expect-error a workflow policy keeps no static data
    Census.builder();
  });
});
