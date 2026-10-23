import { describe, expectTypeOf, it } from "vitest";
import type { Contributor } from "../../../src/journey.js";
import type { Option } from "../../../src/option.js";
import { type Outcome, Step, type StepClass } from "../../../src/step.js";
import type { PlainValue } from "../../../src/value.js";
import {
  classOf,
  integer,
  listOf,
  objectOf,
  optional,
  string,
} from "../../../src/value/token.js";
import { StepPolicy } from "../../../src/policy/step-policy.js";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";
import type { Reason, StepName } from "../../../src/step.js";
import type { Attempt } from "../../../src/step/attempt.js";
import {
  attempt,
  error,
  failureReason,
  input,
  stepName,
  stepReporter,
  type StepReporter,
} from "../../../src/step/request.js";

enum Size {
  Small,
  Large,
}

enum Drink {
  Tea = "tea",
}

type Code = string & { readonly code: true };

declare const reporter: StepReporter;

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

describe("input", () => {
  it("compiles on a parameter whose type accepts what the type written gives", () => {
    class Charge extends Step {
      constructor(
        @input("amount", integer) readonly amount: number,
        @input("coupon", optional(string)) readonly coupon: Option<string>,
        @input("payments", listOf(classOf(Payment)))
        readonly payments: readonly Payment[],
        @input("order", objectOf({ id: string, note: string.optional() }))
        readonly order: {
          readonly id: string;
          readonly note?: string | undefined;
        },
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("compiles with no type written on a parameter whose type the metadata can say", () => {
    class Charge extends Step {
      constructor(
        @input("amount") readonly amount: number,
        @input("payment") readonly payment: Payment,
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a parameter of another type", () => {
    class Charge extends Step {
      // @ts-expect-error an integer is not a string
      constructor(@input("amount", integer) readonly amount: string) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile optional on a parameter that is not an Option", () => {
    class Charge extends Step {
      // @ts-expect-error an optional request gives an Option
      constructor(@input("coupon", optional(string)) readonly coupon: string) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile with no type written on a type the metadata cannot say", () => {
    class Charge extends Step {
      constructor(
        // @ts-expect-error the metadata records a union as Object
        @input("amount") readonly amount: number | string,
        // @ts-expect-error the metadata records a literal as its primitive
        @input("drink") readonly drink: "tea",
        // @ts-expect-error the metadata records an Option as Object
        @input("coupon") readonly coupon: Option<number>,
        // @ts-expect-error the metadata records a numeric enum as Number
        @input("size") readonly size: Size,
        // @ts-expect-error the metadata records a string enum as String
        @input("tea") readonly tea: Drink,
        // @ts-expect-error the metadata records a branded string as String
        @input("code") readonly code: Code,
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a parameter of run", () => {
    class Charge extends Step {
      // @ts-expect-error inputs are given to the constructor
      override run(@input("amount", integer) amount: number): Outcome {
        return amount > 0 ? this.succeed() : this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a class that is not a step", () => {
    class Pricing {
      // @ts-expect-error only a step has inputs
      constructor(@input("amount", integer) readonly amount: number) {}
    }
    expectTypeOf(Pricing).toBeConstructibleWith(1);
  });
});

describe("stepReporter", () => {
  it("compiles on a parameter of run typed as a step reporter", () => {
    class Charge extends Step {
      override async run(
        @stepReporter() reporter: StepReporter,
      ): Promise<Outcome> {
        await reporter.info("charged");
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a parameter of another type", () => {
    class Charge extends Step {
      // @ts-expect-error a step reporter is not a contributor
      override run(@stepReporter() reporter: Contributor): Outcome {
        reporter.contribute("charged", 1);
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile data or metadata that is not a value", async () => {
    // @ts-expect-error a date is not a value
    await reporter.info("charged", new Date());
    // @ts-expect-error a date is not a value
    await reporter.setGlobalMetadata("charged at", new Date());
  });

  it("does not compile on a method other than run", () => {
    class Charge extends Step {
      override run(): Outcome {
        return this.succeed();
      }

      // @ts-expect-error only run is given a step reporter
      report(@stepReporter() reporter: StepReporter): StepReporter {
        return reporter;
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});

describe("the requests of a step hook about its step", () => {
  it("compile in a step policy on parameters of what they give", () => {
    class Audit extends StepPolicy {
      failed(
        @stepName() step: StepName,
        @attempt() attempt: Attempt,
        @failureReason() reason: Reason,
        @failureReason({ optional: true }) maybe: Option<Reason>,
        @error() thrown: unknown,
        @error({ optional: true }) caught: Option<unknown>,
      ): unknown {
        return [step, attempt, reason, maybe, thrown, caught];
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
  });

  it("do not compile when the optional and the required are swapped", () => {
    class Audit extends StepPolicy {
      failed(
        // @ts-expect-error an optional reason may be absent
        @failureReason({ optional: true }) reason: Reason,
        // @ts-expect-error a required reason is never an Option
        @failureReason() maybe: Option<Reason>,
      ): unknown {
        return [reason, maybe];
      }
    }
    expectTypeOf(Audit).toBeConstructibleWith();
  });

  it("do not compile in a workflow policy or a step", () => {
    class Notify extends WorkflowPolicy {
      paid(
        // @ts-expect-error a workflow policy acts on no step
        @stepName() step: StepName,
        // @ts-expect-error a workflow policy acts on no attempt
        @attempt() attempt: Attempt,
      ): unknown {
        return [step, attempt];
      }
    }
    class Charge extends Step {
      override run(): Outcome {
        return this.succeed();
      }

      failure(
        // @ts-expect-error a step is not given its own failure
        @error() thrown: unknown,
      ): unknown {
        return thrown;
      }
    }
    expectTypeOf(Notify).toBeConstructibleWith();
    expectTypeOf(Charge).toExtend<StepClass>();
  });
});
