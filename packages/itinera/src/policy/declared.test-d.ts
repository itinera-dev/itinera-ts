import { describe, it } from "vitest";
import { stepPolicy, workflowPolicy } from "./declared.js";
import { onStepSuccess, onWorkflowSuccess } from "./hooks.js";
import type { OnSuccess } from "./lifecycle.js";
import { StepPolicy } from "./step-policy.js";
import { WorkflowPolicy } from "./workflow-policy.js";

describe("stepPolicy and workflowPolicy", () => {
  it("compile on a policy of their kind whose constructor takes nothing", () => {
    @stepPolicy()
    class Audit extends StepPolicy {
      @onStepSuccess()
      audited(): OnSuccess {
        return this.keepDefault();
      }
    }
    @workflowPolicy()
    class Notify extends WorkflowPolicy {
      @onWorkflowSuccess()
      paid(): void {}
    }
    return [Audit, Notify];
  });

  it("do not compile on a policy whose constructor takes something", () => {
    // @ts-expect-error itinera builds a policy with no arguments
    @stepPolicy()
    class Audit extends StepPolicy {
      constructor(readonly limit: number) {
        super();
      }
    }
    return Audit;
  });

  it("do not compile on a policy of the other kind, or on another class", () => {
    // @ts-expect-error a workflow policy is not a step policy
    @stepPolicy()
    class Notify extends WorkflowPolicy {}
    // @ts-expect-error a step policy is not a workflow policy
    @workflowPolicy()
    class Audit extends StepPolicy {}
    // @ts-expect-error only a class extending WorkflowPolicy is one
    @workflowPolicy()
    class Plain {
      readonly kind = "plain";
    }
    return [Notify, Audit, Plain];
  });
});
