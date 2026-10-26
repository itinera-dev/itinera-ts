import { describe, expect, it } from "vitest";
import { stepPolicy } from "../../../src/policy/declared.js";
import {
  hooksOf,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
} from "../../../src/policy/hooks.js";
import type { OnFailure, OnSuccess } from "../../../src/policy/lifecycle.js";
import { failureCause, retryCause } from "../../../src/policy/request.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import type { RetryCause, StepFailureCause } from "../../../src/policy.js";

describe("the hook decorators", () => {
  it("record which method implements each hook", () => {
    class Audit extends StepPolicy {
      @onStepSuccess()
      audited(): OnSuccess {
        return this.keepDefault();
      }

      @onStepRetry()
      retried(): OnFailure {
        return this.keepDefault();
      }
    }
    expect([...hooksOf(Audit)]).toEqual([
      ["on step success", "audited"],
      ["on step retry", "retried"],
    ]);
  });

  it("refuse one hook on two methods", () => {
    expect(() => {
      class Audit extends StepPolicy {
        @onStepSuccess()
        audited(): OnSuccess {
          return this.keepDefault();
        }

        @onStepSuccess()
        checked(): OnSuccess {
          return this.keepDefault();
        }
      }
      return Audit;
    }).toThrow(
      "Audit defines on step success twice, on audited and on checked",
    );
  });

  it("refuse two hooks on one method", () => {
    expect(() => {
      class Audit extends StepPolicy {
        @onStepRetry()
        @onStepFailure()
        failed(): OnFailure {
          return this.keepDefault();
        }
      }
      return Audit;
    }).toThrow("Audit.failed is marked with two hooks");
  });
});

describe("hooksOf", () => {
  it("gives no hooks for a class with none", () => {
    class Quiet extends StepPolicy {}
    expect(hooksOf(Quiet).size).toBe(0);
  });
});

describe("checkedHook", () => {
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
});
