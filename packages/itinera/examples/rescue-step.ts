import assert from "node:assert/strict";
import {
  failureReason,
  fromRescuedStep,
  input,
  integer,
  None,
  type Option,
  optional,
  type Outcome,
  type Reason,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  type RescueStepClass,
  Some,
  Step,
  step,
  string,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";

@rescueStep()
class Refund extends RescueStep {
  readonly refunded: string[] = [];

  constructor(
    @input("order", string) readonly order: string,
    @fromRescuedStep("charged", optional(integer))
    readonly charged: Option<number>,
    @failureReason({ optional: true }) readonly reason: Option<Reason>,
  ) {
    super();
  }

  override run(): RescueOutcome {
    const why = this.reason.isSome() ? this.reason.value.code : "a throw";
    this.refunded.push(
      `${this.order}: ${String(this.charged.unwrapOr(0))} after ${why}`,
    );
    return this.succeed();
  }
}

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

const rescue: RescueStepClass = Refund;

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", rescue })
class Orders extends Workflow {}

const refund = new Refund("A-1", Some(40), Some({ code: "declined" }));
const unknown = new Refund("B-2", None, None);

assert.deepEqual(refund.run(), { kind: "success" });
assert.deepEqual(refund.refunded, ["A-1: 40 after declined"]);
unknown.run();
assert.deepEqual(unknown.refunded, ["B-2: 0 after a throw"]);
assert.ok(Orders.build() instanceof Orders);
