import { describe, expectTypeOf, it } from "vitest";
import type { JourneyId } from "../journey.js";
import { StepPolicy } from "../policy/step-policy.js";
import { WorkflowPolicy } from "../policy/workflow-policy.js";
import { type Outcome, Step, type StepClass } from "../step.js";
import { journeyId } from "./request.js";

describe("journeyId", () => {
  it("compiles in either kind of policy on a parameter typed as a journey ID", () => {
    class Audit extends StepPolicy {
      audited(@journeyId() id: JourneyId): JourneyId {
        return id;
      }
    }
    class Notify extends WorkflowPolicy {
      paid(@journeyId() id: string): string {
        return id;
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
    expectTypeOf(Notify).toBeConstructibleWith();
  });

  it("does not compile on a parameter of another type, or in a step", () => {
    class Notify extends WorkflowPolicy {
      paid(
        // @ts-expect-error a journey ID is not a number
        @journeyId() id: number,
      ): number {
        return id;
      }
    }
    class Charge extends Step {
      override run(): Outcome {
        return this.succeed();
      }

      journey(
        // @ts-expect-error a step is not given the journey ID
        @journeyId() id: JourneyId,
      ): JourneyId {
        return id;
      }
    }
    expectTypeOf(Notify).toBeConstructibleWith();
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});
