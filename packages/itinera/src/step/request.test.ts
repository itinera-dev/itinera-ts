import { describe, expect, it } from "vitest";
import { requestsOf } from "../declaration.js";
import { Step, type Outcome } from "../step.js";
import type { PlainValue } from "../value.js";
import {
  classCarriedBy,
  integer,
  number,
  optional,
  string,
} from "../value/token.js";
import { input, stepReporter, type StepReporter } from "./request.js";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

class Charge extends Step {
  constructor(
    @input("amount", integer) readonly amount: number,
    @input("coupon", optional(string)) readonly coupon: unknown,
    @input("rate") readonly rate: number,
    @input("payment") readonly payment: Payment,
  ) {
    super();
  }

  override async run(@stepReporter() reporter: StepReporter): Promise<Outcome> {
    await reporter.info("charged");
    return this.succeed();
  }
}

describe("input", () => {
  it("records the key and the type written, as required", () => {
    expect(requestsOf(Charge, undefined)[0]).toEqual({
      kind: "input",
      key: "amount",
      type: { schema: integer, optional: false },
    });
  });

  it("records the type optional wraps, as optional", () => {
    expect(requestsOf(Charge, undefined)[1]).toEqual({
      kind: "input",
      key: "coupon",
      type: { schema: string, optional: true },
    });
  });

  it("reads a type that is not written from the metadata", () => {
    expect(requestsOf(Charge, undefined)[2]).toEqual({
      kind: "input",
      key: "rate",
      type: { schema: number, optional: false },
    });
  });

  it("reads a class that serialises itself from the metadata", () => {
    const [, , , payment] = requestsOf(Charge, undefined);
    expect(
      payment?.kind === "input" && classCarriedBy(payment.type.schema),
    ).toBe(Payment);
  });
});

describe("stepReporter", () => {
  it("records a request for the step reporter", () => {
    expect(requestsOf(Charge, "run")).toEqual([{ kind: "stepReporter" }]);
  });
});
