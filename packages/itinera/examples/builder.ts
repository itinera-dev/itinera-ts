import assert from "node:assert/strict";
import {
  type Event,
  type Outcome,
  type Reporter,
  Step,
  Workflow,
} from "itinera/unstable";

class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Audit implements Reporter {
  readonly kinds: string[] = [];

  report(event: Event): void {
    this.kinds.push(event.kind);
  }
}

class Orders extends Workflow {
  constructor(readonly shop: string) {
    super();
  }

  orderId(): string {
    return `${this.shop}-1`;
  }
}

const orders = Orders.builder()
  .name("orders")
  .step(Charge.builder("charge").retryBudget(1).noRetryOnAbnormalTermination())
  .step(Ship.builder("ship"))
  .reporter(Audit)
  .idGenerator("orderId")
  .constructWith("corner")
  .build();

const instance = orders.instance();
assert.equal(instance.descriptor.name, "orders");
assert.equal(instance.journeyId, "corner-1");
assert.deepEqual(
  instance.descriptor.steps().map((described) => described.name),
  ["charge", "ship"],
);
assert.equal(instance.descriptor.steps()[0]?.retryBudget, 1);
assert.equal(instance.descriptor.steps()[0]?.retryOnAbnormalTermination, false);
