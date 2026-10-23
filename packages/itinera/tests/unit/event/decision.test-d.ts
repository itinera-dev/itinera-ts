import { describe, expectTypeOf, it } from "vitest";
import type { PolicyName } from "../../../src/policy.js";
import type { Reason } from "../../../src/step.js";
import type {
  JourneyFailed,
  JourneySucceeded,
  StepGivenUp,
  StepRescued,
  StepRescuing,
  StepRetrying,
} from "../../../src/event/decision.js";

declare const policy: PolicyName;
declare const reason: Reason;
declare const failed: JourneyFailed;
declare const fields: Pick<
  JourneyFailed,
  "kind" | "sequence" | "timestamp" | "journeyId" | "workflow" | "step"
>;
declare const givenUp: StepGivenUp;
declare function givingUp(decidedBy: StepGivenUp["decidedBy"]): void;
declare function succeeding(decidedBy: JourneySucceeded["decidedBy"]): void;
declare function failing(event: JourneyFailed): void;

describe("decisions", () => {
  it("names the deciding hook only when a hook gave the step up", () => {
    if (givenUp.decidedBy === "default") {
      expectTypeOf(givenUp.cause).not.toEqualTypeOf<"FailWorkflow">();
      expectTypeOf(givenUp.reason).toBeUndefined();
    } else {
      expectTypeOf(givenUp.cause).toEqualTypeOf<"FailWorkflow">();
      expectTypeOf(givenUp.reason).toEqualTypeOf<Reason>();
    }
  });

  it("lets only the hooks before a retry or after an abnormal termination give a step up", () => {
    givingUp({ policy, hook: "on step retry" });
    // @ts-expect-error on step success never gives a step up
    givingUp({ policy, hook: "on step success" });
  });

  it("lets only on step success decide that the journey succeeds", () => {
    succeeding({ policy, hook: "on step success" });
    // @ts-expect-error on step retry never finishes the journey
    succeeding({ policy, hook: "on step retry" });
  });

  it("leaves retries and rescues to the executor's own rule", () => {
    expectTypeOf<
      (StepRetrying | StepRescuing | StepRescued)["decidedBy"]
    >().toEqualTypeOf<"default">();
  });

  it("carries a reason, never an error, when a failure fails the journey", () => {
    if (failed.cause === "failure") {
      expectTypeOf(failed.reason).toEqualTypeOf<Reason>();
      expectTypeOf(failed.errorMessage).toBeUndefined();
    }
  });

  it("never carries both a reason and an error when retries are exhausted", () => {
    const exhausted = { ...fields, cause: "retries exhausted" } as const;
    failing({ ...exhausted, reason, decidedBy: "default" });
    // @ts-expect-error a reason and an error never come together
    failing({
      ...exhausted,
      reason,
      errorMessage: "boom",
      decidedBy: "default",
    });
  });
});
