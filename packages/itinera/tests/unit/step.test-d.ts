import { describe, expectTypeOf, it } from "vitest";
import {
  Attempt,
  type Outcome,
  Step,
  step,
  type StepClass,
  type StepName,
} from "../../src/step.js";

declare function naming(step: StepName): void;

describe("StepName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a step name
    naming("charge");
  });
});

describe("Attempt", () => {
  it("is made only by itinera", () => {
    // @ts-expect-error the constructor is private
    new Attempt(2);
  });

  it("cannot be changed", () => {
    // @ts-expect-error its number is read-only
    Attempt.first.number = 2;
  });
});

describe("Step", () => {
  it("cannot be built itself", () => {
    // @ts-expect-error Step is abstract
    new Step();
  });

  it("needs run", () => {
    @step()
    // @ts-expect-error a step without run does not implement Step
    class Ship extends Step {}
    expectTypeOf(Ship).toBeConstructibleWith();
  });

  it("returns only an outcome from run", () => {
    class Ship extends Step {
      // @ts-expect-error run returns an outcome or a promise of one
      override run(): string {
        return "shipped";
      }
    }
    expectTypeOf(Ship).toBeConstructibleWith();
  });

  it("may run asynchronously", () => {
    class Ship extends Step {
      override run(): Promise<Outcome> {
        return Promise.resolve(this.succeed());
      }
    }
    expectTypeOf(Ship).toExtend<StepClass>();
  });

  it("is a class extending Step, not one that only looks like one", () => {
    class Lookalike {
      run(): Outcome {
        return { kind: "success" };
      }
    }
    expectTypeOf(Lookalike).not.toExtend<StepClass>();
  });
});

describe("step", () => {
  it("marks only a class extending Step", () => {
    // @ts-expect-error the class does not extend Step
    @step()
    class Ship {
      run(): Outcome {
        return { kind: "success" };
      }
    }
    expectTypeOf(Ship).toBeConstructibleWith();
  });
});

describe("the outcomes of a step", () => {
  it("fail and skip with reasons whose details are values", () => {
    interface Limit {
      readonly limit: number;
    }
    class Charge extends Step {
      constructor(private readonly limit: Limit) {
        super();
      }

      override run(): Outcome {
        return this.limit.limit > 0
          ? this.fail({ code: "declined", details: this.limit })
          : this.skipBecause({ code: "empty", message: "nothing to charge" });
      }
    }
    expectTypeOf(Charge).toBeConstructibleWith({ limit: 5 });
  });

  it("refuse details that are not values", () => {
    class Charge extends Step {
      override run(): Outcome {
        // @ts-expect-error a Date is not a value
        return this.fail({ code: "declined", details: new Date() });
      }
    }
    class Discount extends Step {
      override run(): Outcome {
        // @ts-expect-error a function is not a value
        return this.skipBecause({ code: "empty", details: () => 1 });
      }
    }
    expectTypeOf(Charge).toBeConstructibleWith();
    expectTypeOf(Discount).toBeConstructibleWith();
  });
});
