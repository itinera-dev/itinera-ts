import assert from "node:assert/strict";
import { None, type Option, Some } from "itinera/option";
import {
  failureReason,
  fromRescuedStep,
  input,
  type Outcome,
  type Reason,
  RescueStep,
  rescueStep,
  type RescueOutcome,
  type RescueStepBuilder,
  type RescueStepClass,
  Step,
  step,
} from "itinera/step";
import { withStep, Workflow, workflow } from "itinera/workflow";
import { integer, optional, string } from "itinera/value";

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

class Weigh extends RescueStep {
  constructor(readonly grams: number) {
    super();
  }

  override run(): RescueOutcome {
    return this.grams > 0 ? this.succeed() : this.fail("nothing to weigh");
  }
}

const rescue: RescueStepClass = Refund;

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", rescue })
class Orders extends Workflow {}

const weighing: RescueStepBuilder<typeof Weigh> = Weigh.builder().needs(
  fromRescuedStep("grams", integer),
);
const shipping = Orders.builder()
  .step(Charge.builder("ship").rescue(weighing))
  .build();

const refund = new Refund("A-1", Some(40), Some({ code: "declined" }));
const unknown = new Refund("B-2", None, None);

assert.deepEqual(refund.run(), { kind: "success" });
assert.deepEqual(refund.refunded, ["A-1: 40 after declined"]);
unknown.run();
assert.deepEqual(unknown.refunded, ["B-2: 0 after a throw"]);
assert.deepEqual(new Weigh(0).run(), {
  kind: "failure",
  reason: { code: "nothing to weigh" },
});
assert.ok(Orders.build() instanceof Orders);
assert.deepEqual(
  shipping
    .instance()
    .descriptor.steps()
    .map((described) => described.name),
  ["charge", "ship"],
);
