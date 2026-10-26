import assert from "node:assert/strict";
import {
  LocalExecutor,
  type Outcome,
  Refusal,
  Step,
  Workflow,
} from "itinera/unstable";

class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(Ship.builder("ship"))
    .build();
  const executor = new LocalExecutor();
  const instance = orders.instance();

  const running = executor.run(instance);
  await assert.rejects(executor.run(orders.instance()), {
    name: "Refusal",
    refused: { kind: "journey running" },
  });
  assert.ok((await running).isSucceeded());

  await assert.rejects(executor.run(instance), Refusal);
  await assert.rejects(executor.run(instance), {
    refused: { kind: "instance ran" },
    message:
      "run refused an instance that already ran: make an instance for each journey",
  });
})();
