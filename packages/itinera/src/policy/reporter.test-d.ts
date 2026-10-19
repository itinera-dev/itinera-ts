import { describe, expectTypeOf, it } from "vitest";
import { type Outcome, Step, type StepClass } from "../step.js";
import type { StepReporter } from "../step/request.js";
import { type HookReporter, hookReporter } from "./reporter.js";
import { StepPolicy } from "./step-policy.js";

declare const reporter: HookReporter;

describe("hookReporter", () => {
  it("compiles in a policy on a parameter typed as a hook reporter", () => {
    class Audit extends StepPolicy {
      async audited(@hookReporter() reporter: HookReporter): Promise<void> {
        await reporter.warning("audited", { charged: 40 });
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
  });

  it("does not compile in a step", () => {
    class Charge extends Step {
      override async run(
        // @ts-expect-error a step has a step reporter
        @hookReporter() reporter: StepReporter,
      ): Promise<Outcome> {
        await reporter.info("charged");
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});

describe("HookReporter", () => {
  it("does not take data or metadata that is not a value", async () => {
    // @ts-expect-error a date is not a value
    await reporter.error("refunded", new Date());
    // @ts-expect-error a date is not a value
    await reporter.setGlobalMetadata("refunded at", new Date());
  });
});
