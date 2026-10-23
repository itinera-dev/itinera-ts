import { describe, expect, it } from "vitest";
import { contributor } from "../../../src/journey/contributor.js";
import type { Contributor } from "../../../src/journey.js";
import {
  declarationOfPolicy,
  stepPolicy,
  workflowPolicy,
} from "../../../src/policy/declared.js";
import {
  onStepFailure,
  onStepRetry,
  onStepSuccess,
  onWorkflowSuccess,
} from "../../../src/policy/hooks.js";
import type { OnFailure, OnSuccess } from "../../../src/policy/lifecycle.js";
import { failureCause, retryCause } from "../../../src/policy/request.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import type { RetryCause, StepFailureCause } from "../../../src/policy.js";

describe("stepPolicy", () => {
  it("records the policy's name and each hook with its requests", () => {
    @stepPolicy({ name: "audit" })
    class Audit extends StepPolicy {
      @onStepSuccess()
      audited(@contributor() contributor: Contributor): OnSuccess {
        contributor.contribute("audited", true);
        return this.keepDefault();
      }
    }
    const declared = declarationOfPolicy(Audit);
    expect(declared?.name).toBe("audit");
    expect([...(declared?.hooks ?? [])]).toEqual([
      [
        "on step success",
        { key: "audited", requests: [{ kind: "contributor" }] },
      ],
    ]);
  });

  it("names the policy after its class when no name is given", () => {
    @stepPolicy()
    class Audit extends StepPolicy {
      @onStepSuccess()
      audited(): OnSuccess {
        return this.keepDefault();
      }
    }
    expect(declarationOfPolicy(Audit)?.name).toBe("Audit");
  });

  it("gives the failure cause to on step failure and the retry cause to on step retry", () => {
    @stepPolicy()
    class Causes extends StepPolicy {
      @onStepFailure()
      failed(@failureCause() cause: StepFailureCause): OnFailure {
        return this.failWorkflow(cause);
      }

      @onStepRetry()
      retried(@retryCause() cause: RetryCause): OnFailure {
        return this.failWorkflow(cause);
      }
    }
    expect([...(declarationOfPolicy(Causes)?.hooks ?? [])]).toEqual([
      [
        "on step failure",
        { key: "failed", requests: [{ kind: "failureCause" }] },
      ],
      ["on step retry", { key: "retried", requests: [{ kind: "retryCause" }] }],
    ]);
  });

  it.each([
    [
      "the failure cause outside on step failure",
      () => {
        @stepPolicy()
        class Audit extends StepPolicy {
          @onStepRetry()
          retried(@failureCause() cause: StepFailureCause): OnFailure {
            return this.failWorkflow(cause);
          }
        }
        return Audit;
      },
      "Audit.retried requests the failure cause, which only on step failure is given",
    ],
    [
      "the retry cause outside on step retry",
      () => {
        @stepPolicy()
        class Audit extends StepPolicy {
          @onStepFailure()
          failed(@retryCause() cause: RetryCause): OnFailure {
            return this.failWorkflow(cause);
          }
        }
        return Audit;
      },
      "Audit.failed requests the retry cause, which only on step retry is given",
    ],
  ])("refuses a hook that requests %s", (_, declaring, message) => {
    expect(declaring).toThrow(message);
  });

  it.each([
    [
      "a class that extends another policy",
      () => {
        class Base extends StepPolicy {}
        @stepPolicy()
        class Audit extends Base {
          @onStepSuccess()
          audited(): OnSuccess {
            return this.keepDefault();
          }
        }
        return Audit;
      },
      "Audit must extend StepPolicy itself",
    ],
    [
      "a class declared twice",
      () => {
        @stepPolicy()
        @stepPolicy()
        class Audit extends StepPolicy {
          @onStepSuccess()
          audited(): OnSuccess {
            return this.keepDefault();
          }
        }
        return Audit;
      },
      "Audit is declared as a policy twice",
    ],
    [
      "an empty name",
      () => {
        @stepPolicy({ name: "" })
        class Audit extends StepPolicy {
          @onStepSuccess()
          audited(): OnSuccess {
            return this.keepDefault();
          }
        }
        return Audit;
      },
      "policy class Audit has an empty name",
    ],
    [
      "a policy with no hook",
      () => {
        @stepPolicy({ name: "audit" })
        class Audit extends StepPolicy {}
        return Audit;
      },
      "policy audit defines no hook",
    ],
    [
      "a method with requests but no hook",
      () => {
        @stepPolicy()
        class Audit extends StepPolicy {
          @onStepSuccess()
          audited(): OnSuccess {
            return this.keepDefault();
          }

          note(@contributor() contributor: Contributor): void {
            contributor.contribute("noted", true);
          }
        }
        return Audit;
      },
      "Audit.note carries requests, but is marked with no hook",
    ],
    [
      "a parameter of a hook with no request",
      () => {
        @stepPolicy()
        class Audit extends StepPolicy {
          @onStepSuccess()
          audited(charged: number): OnSuccess {
            return charged > 0 ? this.keepDefault() : this.finishWorkflow();
          }
        }
        return Audit;
      },
      "Audit.audited: parameter 1 carries no request",
    ],
  ])("refuses %s", (_, declaring, message) => {
    expect(declaring).toThrow(message);
  });
});

describe("workflowPolicy", () => {
  it("records the policy's hooks", () => {
    @workflowPolicy({ name: "notify" })
    class Notify extends WorkflowPolicy {
      @onWorkflowSuccess()
      paid(@contributor() contributor: Contributor): void {
        contributor.contribute("notified", true);
      }
    }
    expect([...(declarationOfPolicy(Notify)?.hooks.keys() ?? [])]).toEqual([
      "on workflow success",
    ]);
  });

  it("refuses a class that extends another policy", () => {
    class Base extends WorkflowPolicy {}
    expect(() => {
      @workflowPolicy()
      class Notify extends Base {
        @onWorkflowSuccess()
        paid(): void {}
      }
      return Notify;
    }).toThrow("Notify must extend WorkflowPolicy itself");
  });
});

describe("declarationOfPolicy", () => {
  it("gives nothing for a class not declared", () => {
    class Audit extends StepPolicy {}
    expect(declarationOfPolicy(Audit)).toBeUndefined();
  });
});
