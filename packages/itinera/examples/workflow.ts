import assert from "node:assert/strict";
import type { Event } from "itinera/event";
import type { Reporter } from "itinera/report";
import { type Outcome, Step, step } from "itinera/step";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@step()
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

@workflow({ name: "orders", reporters: [Audit] })
@withStep(Charge, { name: "charge", retryBudget: 1 })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  constructor(readonly shop: string) {
    super();
  }
}

const orders = Orders.build("corner");
const instance = orders.instance({
  order: "1",
  price: 40,
  discount: undefined,
});

assert.equal(instance.workflow.shop, "corner");
assert.equal(instance.descriptor.name, "orders");
assert.deepEqual(
  instance.descriptor.steps().map((described) => described.name),
  ["charge", "ship"],
);
assert.deepEqual(
  [...instance.initialData],
  [
    ["order", "1"],
    ["price", 40],
  ],
);
