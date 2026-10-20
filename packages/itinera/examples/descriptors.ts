import assert from "node:assert/strict";
import { type Provided, provider, service, serviceType } from "itinera/service";
import {
  type Outcome,
  Step,
  step,
  type StepName,
  stepName,
} from "itinera/step";
import {
  inputAdapter,
  key,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

const RECEIPTS = serviceType<string[]>("Receipts");

@step()
class Charge extends Step {
  override run(@service("receipts", RECEIPTS) receipts: string[]): Outcome {
    receipts.push("charged");
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

  @provider(RECEIPTS, { perAttempt: true })
  receipts(@stepName() step: StepName): Provided<string[]> {
    return this.provide([`receipts of ${step}`]);
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
assert.deepEqual(
  descriptor.provide(payments, charge.name, "receipts", [charge.name]),
  { instance: ["receipts of charge"] },
);
