import { describe, it } from "vitest";
import {
  onStepAbnormalTermination,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
  onWorkflowFailure,
  onWorkflowSuccess,
} from "../../../src/policy/hooks.js";
import type { OnFailure, OnSuccess } from "../../../src/policy/lifecycle.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";

describe("the step hooks", () => {
  it("compile on methods returning their lifecycles, or promises of them", () => {
    class Audit extends StepPolicy {
      @onStepSuccess()
      audited(): OnSuccess {
        return this.finishWorkflow();
      }

      @onStepFailure()
      async failed(): Promise<OnFailure> {
        return Promise.resolve(this.failWorkflow("declined"));
      }

      @onStepRetry()
      retried(): OnFailure {
        return this.keepDefault();
      }

      @onStepAbnormalTermination()
      crashed(): OnFailure {
        return this.failWorkflow({ code: "crashed", message: "it threw" });
      }
    }
    return Audit;
  });

  it("do not compile when a failure hook finishes the workflow", () => {
    class Audit extends StepPolicy {
      // @ts-expect-error a failure hook cannot finish the workflow
      @onStepFailure()
      failed() {
        return this.finishWorkflow();
      }

      // @ts-expect-error a retry hook cannot finish the workflow
      @onStepRetry()
      retried() {
        return this.finishWorkflow();
      }

      // @ts-expect-error an abnormal termination hook cannot finish the workflow
      @onStepAbnormalTermination()
      crashed() {
        return this.finishWorkflow();
      }
    }
    return Audit;
  });

  it("do not compile on a method returning nothing, or anything else", () => {
    class Audit extends StepPolicy {
      // @ts-expect-error the default is returned with keepDefault()
      @onStepSuccess()
      audited(): void {}

      // @ts-expect-error a hook returns a lifecycle, never a string
      @onStepFailure()
      failed(): string {
        return "failed";
      }
    }
    return Audit;
  });

  it("do not compile on a workflow policy", () => {
    class Notify extends WorkflowPolicy {
      // @ts-expect-error a step hook belongs to a step policy
      @onStepSuccess()
      paid(): OnSuccess {
        return { kind: "KeepDefault" };
      }
    }
    return Notify;
  });
});

describe("the workflow hooks", () => {
  it("compile on methods returning nothing, or a promise of it", () => {
    class Notify extends WorkflowPolicy {
      @onWorkflowSuccess()
      paid(): void {}

      @onWorkflowFailure()
      async refunded(): Promise<void> {
        await Promise.resolve();
      }
    }
    return Notify;
  });

  it("do not compile on a method returning a value", () => {
    class Notify extends WorkflowPolicy {
      // @ts-expect-error a workflow hook returns nothing
      @onWorkflowSuccess()
      paid(): number {
        return 1;
      }
    }
    return Notify;
  });

  it("do not compile on a step policy or a class that is not a policy", () => {
    class Audit extends StepPolicy {
      // @ts-expect-error a workflow hook belongs to a workflow policy
      @onWorkflowSuccess()
      paid(): void {}
    }
    class Plain {
      // @ts-expect-error only a policy has hooks
      @onWorkflowSuccess()
      paid(): void {}
    }
    return [Audit, Plain];
  });
});
