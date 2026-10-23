import { describe, expectTypeOf, it } from "vitest";
import type { Option } from "../../../src/option.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import { type Outcome, Step, type StepClass } from "../../../src/step.js";
import { integer, optional } from "../../../src/value/token.js";
import { fromWorkflow } from "../../../src/workflow/request.js";

describe("fromWorkflow", () => {
  it("compiles in either kind of policy on a parameter of the type it gives", () => {
    class Audit extends StepPolicy {
      audited(@fromWorkflow("price", integer) price: number): number {
        return price;
      }
    }
    class Notify extends WorkflowPolicy {
      paid(
        @fromWorkflow("discount", optional(integer)) discount: Option<number>,
        @fromWorkflow("payment") payment: string,
      ): string {
        return `${payment} ${String(discount.unwrapOr(0))}`;
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
    expectTypeOf(Notify).toBeConstructibleWith();
  });

  it("does not compile on a parameter of another type, or in a step's run", () => {
    class Notify extends WorkflowPolicy {
      paid(
        // @ts-expect-error an optional value may be absent
        @fromWorkflow("discount", optional(integer)) discount: number,
      ): number {
        return discount;
      }
    }
    class Charge extends Step {
      override run(): Outcome {
        return this.succeed();
      }

      price(
        // @ts-expect-error a step's inputs are given to its constructor
        @fromWorkflow("price", integer) price: number,
      ): number {
        return price;
      }
    }
    expectTypeOf(Notify).toBeConstructibleWith();
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});
