import { describe, expect, it } from "vitest";
import {
  hooksOf,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
} from "../../../src/policy/hooks.js";
import type { OnFailure, OnSuccess } from "../../../src/policy/lifecycle.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";

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
