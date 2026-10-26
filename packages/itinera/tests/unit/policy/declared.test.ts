import { describe, expect, it } from "vitest";
import { contributor } from "../../../src/journey/contributor.js";
import type { Contributor } from "../../../src/journey.js";
import {
  declaredPolicy,
  isDeclaredPolicy,
  stepPolicy,
  workflowPolicy,
} from "../../../src/policy/declared.js";
import {
  hookOf,
  type PolicyDescriptor,
} from "../../../src/policy/descriptor.js";
import type { Hook } from "../../../src/policy/hooks.js";
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
import { Census, Tracker } from "../../fixtures/policy.js";

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
    const declared = declaredPolicy(Audit, "step");
    expect(declared.name).toBe("audit");
    expect(hooksOf(declared)).toEqual([
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
    expect(declaredPolicy(Audit, "step").name).toBe("Audit");
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
    expect(hooksOf(declaredPolicy(Causes, "step"))).toEqual([
      [
        "on step failure",
        { key: "failed", requests: [{ kind: "failureCause" }] },
      ],
      ["on step retry", { key: "retried", requests: [{ kind: "retryCause" }] }],
    ]);
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
    [
      "a class that keeps static data",
      () => {
        // @ts-expect-error a policy keeps no static data
        stepPolicy()(Tracker);
      },
      "step policy Tracker keeps static data, which everything built from it would share: failures",
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
    expect(declaredPolicy(Notify, "workflow").hooks()).toEqual([
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

  it("refuses a class that keeps static data", () => {
    expect(() => {
      // @ts-expect-error a policy keeps no static data
      workflowPolicy()(Census);
    }).toThrow(
      `workflow policy Census keeps static data, which everything built from it would share: journeys`,
    );
  });
});

describe("declaredPolicy", () => {
  it("refuses a class not declared", () => {
    class Audit extends StepPolicy {}
    expect(isDeclaredPolicy(Audit)).toBe(false);
    expect(() => declaredPolicy(Audit, "step")).toThrow(
      "Audit is not declared with @stepPolicy",
    );
  });

  it("refuses a policy of the other kind", () => {
    @workflowPolicy()
    class Notify extends WorkflowPolicy {
      @onWorkflowSuccess()
      paid(): void {}
    }
    expect(() => declaredPolicy(Notify, "step")).toThrow(
      "Notify is not declared with @stepPolicy",
    );
  });
});

function hooksOf(described: PolicyDescriptor): unknown[] {
  return described.hooks().map((hook) => definitionOf(described, hook));
}

function definitionOf(described: PolicyDescriptor, hook: Hook): unknown[] {
  return [hook, hookOf(described, hook)];
}
