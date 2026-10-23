import assert from "node:assert/strict";
import {
  idGenerator,
  type Outcome,
  Step,
  step,
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

@workflow({ name: "orders" })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  #orders = 0;

  constructor(readonly shop: string) {
    super();
  }

  @idGenerator()
  orderId(): string {
    this.#orders += 1;
    return `${this.shop}-${String(this.#orders)}`;
  }
}

const orders = Orders.build("corner");

assert.equal(orders.instance().journeyId, "corner-1");
assert.equal(orders.instance().journeyId, "corner-2");
