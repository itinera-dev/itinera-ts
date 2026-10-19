import { describe, expectTypeOf, it } from "vitest";
import { type Outcome, Step, type StepClass } from "../step.js";
import type { StepReporter } from "../step/request.js";
import { type Contributor, contributor } from "./contributor.js";

declare const given: Contributor;

describe("Contributor", () => {
  it("contributes a value", () => {
    given.contribute("order", { id: "R-1", lines: [{ sku: "tea" }] });
  });

  it("does not contribute what is not a value", () => {
    // @ts-expect-error a date is not a value
    given.contribute("at", new Date());
  });
});

describe("contributor", () => {
  it("does not compile on a parameter of another type", () => {
    class Charge extends Step {
      override async run(
        // @ts-expect-error a contributor is not a step reporter
        @contributor() reporter: StepReporter,
      ): Promise<Outcome> {
        await reporter.info("charged");
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on the constructor", () => {
    class Charge extends Step {
      // @ts-expect-error a contributor is given to run
      constructor(@contributor() readonly contributor: Contributor) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});
