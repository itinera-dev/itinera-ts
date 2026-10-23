import { describe, expectTypeOf, it } from "vitest";
import type { Option } from "../../../src/option.js";
import {
  type Outcome,
  type Skip,
  Step,
  type StepClass,
} from "../../../src/step.js";
import { Charge } from "../../fixtures/step.js";
import { integer, optional } from "../../../src/value/token.js";
import { Workflow } from "../../../src/workflow.js";
import { withStep, workflow } from "../../../src/workflow/decorators.js";
import {
  failureReason,
  input,
  stepReporter,
} from "../../../src/step/request.js";
import type { StepReporter } from "../../../src/step/request.js";
import type { Reason } from "../../../src/step.js";
import {
  fromRescuedStep,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  type RescueStepClass,
} from "../../../src/step/rescue.js";

describe("a rescue step", () => {
  it("fails, but never skips", () => {
    class Refund extends RescueStep {
      override run(): RescueOutcome {
        return this.fail({ code: "declined", details: { limit: 5 } });
      }
    }
    expectTypeOf(Refund).toExtend<RescueStepClass>();
    expectTypeOf<Skip>().not.toExtend<RescueOutcome>();
  });

  it("compiles with the requests of a rescue step", () => {
    @rescueStep()
    class Refund extends RescueStep {
      constructor(
        @input("order", integer) readonly order: number,
        @fromRescuedStep("charged", optional(integer))
        readonly charged: Option<number>,
        @failureReason() readonly reason: Reason,
      ) {
        super();
      }

      override async run(
        @stepReporter() reporter: StepReporter,
      ): Promise<RescueOutcome> {
        await reporter.info(String(this.order));
        return this.succeed();
      }
    }
    expectTypeOf(Refund).toExtend<RescueStepClass>();
  });

  it("is not a step, nor a step a rescue step", () => {
    class Refund extends RescueStep {
      override run(): RescueOutcome {
        return this.succeed();
      }
    }
    expectTypeOf(Refund).not.toExtend<StepClass>();
    expectTypeOf(Charge).not.toExtend<RescueStepClass>();
  });

  it("is the only kind of class a step names as its rescue", () => {
    @workflow({ name: "orders" })
    // @ts-expect-error a step is not a rescue step
    @withStep(Charge, { name: "charge", rescue: Charge })
    class Orders extends Workflow {}
    expectTypeOf(Orders).toBeConstructibleWith();
  });
});

describe("fromRescuedStep", () => {
  it("does not compile on a parameter of another type", () => {
    class Refund extends RescueStep {
      constructor(
        // @ts-expect-error an integer is not a string
        @fromRescuedStep("charged", integer) readonly charged: string,
      ) {
        super();
      }

      override run(): RescueOutcome {
        return this.succeed();
      }
    }
    expectTypeOf(Refund).toExtend<RescueStepClass>();
  });

  it("does not compile in a step, nor on run", () => {
    class Charge extends Step {
      constructor(
        // @ts-expect-error only a rescue step reads from the step it rescues
        @fromRescuedStep("charged", integer) readonly charged: number,
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    class Refund extends RescueStep {
      override run(
        // @ts-expect-error what the rescued step contributed is given to the constructor
        @fromRescuedStep("charged", integer) charged: number,
      ): RescueOutcome {
        return charged > 0 ? this.succeed() : this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
    expectTypeOf(Refund).toExtend<RescueStepClass>();
  });
});
