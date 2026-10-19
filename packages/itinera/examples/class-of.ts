import assert from "node:assert/strict";
import {
  input,
  LocalExecutor,
  type Outcome,
  Step,
  step,
  Workflow,
} from "itinera/unstable";
import { classOf, type PlainValue, type ValueClass } from "itinera/value";

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
  static refunded: Payment[] = [];

  constructor(
    @input("payment", classOf(Payment)) readonly payment: Payment,
    @input("previous") readonly previous: Payment,
  ) {
    super();
  }

  override run(): Outcome {
    Refund.refunded.push(this.payment, this.previous);
    return this.succeed();
  }
}

class Refunds extends Workflow {}

export default (async () => {
  const refunds = Refunds.builder()
    .name("refunds")
    .step(Refund.builder("refund"))
    .build();
  const instance = refunds.instance(
    new Map([
      ["payment", new Payment(1250)],
      ["previous", new Payment(0)],
    ]),
  );

  await new LocalExecutor().run(instance);

  const type: ValueClass<Payment> = Payment;
  assert.equal(type.fromValue(1250).cents, 1250);
  assert.ok(classOf(Payment).safeParse(1250).success);
  assert.deepEqual(Refund.refunded, [new Payment(1250), new Payment(0)]);
})();
