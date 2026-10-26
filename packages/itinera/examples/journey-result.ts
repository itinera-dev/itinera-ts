import assert from "node:assert/strict";
import { LocalExecutor, Step, Workflow } from "itinera/unstable";

class Charge extends Step {
  override run(): never {
    throw new Error("gateway down");
  }
}

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(Charge.builder("charge"))
    .build();
  const instance = orders.instance(new Map([["order", "A-1"]]));

  const result = await new LocalExecutor().run(instance);

  assert.equal(result.journeyId, instance.journeyId);
  assert.ok(result.isFailed());
  assert.deepEqual(result.status.dataBag.keys(), ["order"]);
  assert.equal(result.failure?.cause, "abnormal termination");
  assert.equal(result.failure.errorMessage, "gateway down");
  assert.equal(result.abort, undefined);
})();
