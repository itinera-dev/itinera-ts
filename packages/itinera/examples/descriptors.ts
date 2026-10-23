import assert from "node:assert/strict";
import {
  type Outcome,
  Step,
  step,
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
class Payments extends Workflow {}

const { descriptor } = Payments.build().instance();
const [charge] = descriptor.steps();
assert.ok(charge);

assert.equal(descriptor.name, "payments");
assert.equal(charge.name, "charge");
assert.equal(charge.retryBudget, 2);
assert.equal(charge.retryOnAbnormalTermination, false);
assert.ok(charge.build() instanceof Charge);
assert.deepEqual(descriptor.reporters(), []);
