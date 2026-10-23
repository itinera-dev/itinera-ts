import assert from "node:assert/strict";
import {
  inputAdapter,
  key,
  type Outcome,
  Step,
  step,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@workflow({ name: "payments" })
@withStep(Charge, {
  name: "charge",
  retryBudget: 2,
  noRetryOnAbnormalTermination: true,
})
class Payments extends Workflow {
  @inputAdapter({ steps: ["charge"] })
  price(@key() key: string): Supplied {
    return this.supply(key.length);
  }
}

const { descriptor, workflow: payments } = Payments.build().instance();
const [charge] = descriptor.steps();
assert.ok(charge);

assert.equal(descriptor.name, "payments");
assert.equal(charge.name, "charge");
assert.equal(charge.retryBudget, 2);
assert.equal(charge.retryOnAbnormalTermination, false);
assert.ok(charge.build() instanceof Charge);
assert.deepEqual(descriptor.reporters(), []);
assert.deepEqual(descriptor.adapt(payments, charge.name, ["amount"]), {
  kind: "supplied",
  value: 6,
});
