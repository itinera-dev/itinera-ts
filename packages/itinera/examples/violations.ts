import assert from "node:assert/strict";
import {
  type Outcome,
  Step,
  step,
  ViolationKind,
  Violations,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

function declareTwoShips(): typeof Workflow {
  @workflow({ name: "orders" })
  @withStep(Ship, { name: "ship" })
  @withStep(Ship, { name: "ship" })
  class Orders extends Workflow {}
  return Orders;
}

assert.throws(declareTwoShips, (error: unknown) => {
  assert.ok(error instanceof Violations);
  assert.deepEqual(error.violations, [
    { kind: ViolationKind.DuplicateStepName, step: "ship" },
  ]);
  assert.equal(error.message, "duplicate step name: ship");
  return true;
});
