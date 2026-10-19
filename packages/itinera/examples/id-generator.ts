import assert from "node:assert/strict";
import {
  type DataBag,
  dataBag,
  idGenerator,
  type Outcome,
  Step,
  step,
  withStep,
  Workflow,
  workflow,
} from "itinera/unstable";
import { integer } from "itinera/value";

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {
  constructor(readonly shop: string) {
    super();
  }

  @idGenerator()
  orderId(@dataBag() data: DataBag): string {
    const number = data.read("number", integer).option();
    return `${this.shop}-${number.map(String).unwrapOr("unnumbered")}`;
  }
}

const orders = Orders.build("corner");

assert.equal(orders.instance({ number: 7 }).journeyId, "corner-7");
assert.equal(orders.instance().journeyId, "corner-unnumbered");
