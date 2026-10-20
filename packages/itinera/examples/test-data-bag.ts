import assert from "node:assert/strict";
import { dataBag, type DataBag } from "itinera/journey";
import { TestDataBag } from "itinera/testing";
import { input, type Outcome, Step, step } from "itinera/step";
import { integer } from "itinera/value";
import {
  inputAdapter,
  type Supplied,
  type SuppliedValue,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

@step()
class Charge extends Step {
  constructor(@input("total", integer) readonly total: number) {
    super();
  }

  override run(): Outcome {
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge" })
class Orders extends Workflow {
  @inputAdapter({ steps: ["charge"] })
  total(@dataBag() bag: DataBag): Supplied {
    return this.supply(bag.read("price", integer).option().unwrapOr(0) + 5);
  }
}

const bag = new TestDataBag().with("price", 40);

assert.deepEqual(Orders.build().total(bag.access), {
  kind: "supplied",
  value: 45,
} satisfies SuppliedValue);
