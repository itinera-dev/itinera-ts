import assert from "node:assert/strict";
import type { Event } from "itinera/event";
import { type DataBag, dataBag } from "itinera/journey";
import type { Reporter } from "itinera/report";
import { type Outcome, Step } from "itinera/step";
import { Workflow } from "itinera/workflow";
import { integer } from "itinera/value";

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

  orderId(data: DataBag): string {
    const number = data.read("number", integer).option();
    return `${this.shop}-${number.map(String).unwrapOr("unnumbered")}`;
  }
}

const orders = Orders.builder()
  .name("orders")
  .step(Charge.builder("charge").retryBudget(1).noRetryOnAbnormalTermination())
  .step(Ship.builder("ship"))
  .reporter(Audit)
  .idGenerator("orderId", dataBag())
  .constructWith("corner")
  .build();

const instance = orders.instance({ number: 7 });
assert.equal(instance.descriptor.name, "orders");
assert.equal(instance.journeyId, "corner-7");
assert.deepEqual(
  instance.descriptor.steps().map((described) => described.name),
  ["charge", "ship"],
);
assert.equal(instance.descriptor.steps()[0]?.retryBudget, 1);
assert.equal(instance.descriptor.steps()[0]?.retryOnAbnormalTermination, false);
