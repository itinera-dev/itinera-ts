import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { type Contributor, contributor } from "itinera/journey";
import { input, type Outcome, Step, step } from "itinera/step";
import { Workflow } from "itinera/workflow";
import {
  classOf,
  integer,
  type PlainValue,
  type ValueClass,
} from "itinera/value";

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

  override run(@contributor() contributor: Contributor): Outcome {
    contributor.contribute(
      "refunded",
      this.payment.cents + this.previous.cents,
    );
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
      ["previous", new Payment(250)],
    ]),
  );

  const result = await new LocalExecutor().run(instance);

  const type: ValueClass<Payment> = Payment;
  assert.equal(type.fromValue(1250).cents, 1250);
  assert.ok(classOf(Payment).safeParse(1250).success);
  assert.ok(result.isSucceeded());
  const { dataBag } = result.status;
  assert.equal(dataBag.read("refunded", integer).option().unwrap(), 1500);
  assert.deepEqual(
    dataBag.read("payment", classOf(Payment)).option().unwrap(),
    new Payment(1250),
  );
})();
