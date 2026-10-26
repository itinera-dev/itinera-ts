import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import type { Read } from "itinera/journey";
import { None, Some } from "itinera/option";
import { Step } from "itinera/step";
import { Workflow } from "itinera/workflow";
import { integer, string } from "itinera/value";

class Charge extends Step {
  override run() {
    return this.succeed();
  }
}

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(Charge.builder("charge"))
    .build();
  const instance = orders.instance(
    new Map<string, string | number>([
      ["order", "A-1"],
      ["amount", 1250],
    ]),
  );

  const result = await new LocalExecutor().run(instance);

  assert.ok(result.isSucceeded());
  const { dataBag } = result.status;
  const amount: Read<number> = dataBag.read("amount", integer);
  assert.equal(amount.kind, "present");
  assert.deepEqual(amount.option(), Some(1250));
  assert.equal(dataBag.read("order", integer).kind, "other type");
  assert.equal(dataBag.read("shop", string).kind, "absent");
  assert.equal(dataBag.read("shop", string).option(), None);
})();
