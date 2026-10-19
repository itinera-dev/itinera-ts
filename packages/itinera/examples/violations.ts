import assert from "node:assert/strict";
import {
  key,
  type Outcome,
  service,
  serviceType,
  Step,
  step,
  type Supplied,
  type Violation,
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

const COURIER = serviceType<{ book(): void }>("Courier");

class Deliver extends Step {
  override run(courier: { book(): void }): Outcome {
    courier.book();
    return this.succeed();
  }
}

class Shipping extends Workflow {
  pricing(inputKey: string): Supplied {
    return this.supply(inputKey.length);
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

assert.throws(
  () =>
    Shipping.builder()
      .name("shipping")
      .step(Deliver.builder("deliver").run(service("courier", COURIER)))
      .inputAdapter("pricing", { steps: ["pack"] }, key())
      .build(),
  (error: unknown) => {
    assert.ok(error instanceof Violations);
    const found: readonly Violation[] = error.violations;
    assert.deepEqual(found, [
      {
        kind: ViolationKind.InputAdapterForUnknownStep,
        adapter: "pricing",
        step: "pack",
      },
      {
        kind: ViolationKind.ServiceNotProvided,
        step: "deliver",
        key: "courier",
      },
    ]);
    assert.equal(
      error.message,
      "input adapter for unknown step: pricing on pack\nservice not provided: courier for deliver",
    );
    return true;
  },
);
