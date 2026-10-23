import assert from "node:assert/strict";
import {
  classOf,
  input,
  type Outcome,
  type PlainValue,
  Step,
  step,
  type ValueClass,
} from "itinera/unstable";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    if (typeof value !== "number") {
      throw new TypeError("a payment is a number of cents");
    }
    return new Payment(value);
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

@step()
class Refund extends Step {
  constructor(
    @input("payment", classOf(Payment)) readonly payment: Payment,
    @input("previous") readonly previous: Payment,
  ) {
    super();
  }

  override run(): Outcome {
    return this.succeed();
  }
}

const type: ValueClass<Payment> = Payment;
assert.equal(type.fromValue(1250).cents, 1250);
assert.ok(classOf(Payment).safeParse(1250).success);
assert.equal(new Refund(new Payment(1250), new Payment(0)).payment.cents, 1250);
