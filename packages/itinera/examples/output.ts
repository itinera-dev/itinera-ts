import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { OutputError } from "itinera/journey";
import { None, type Option } from "itinera/option";
import { Step } from "itinera/step";
import { Workflow } from "itinera/workflow";
import { integer, optional, string } from "itinera/value";

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
  const instance = orders.instance({ order: "A-1", amount: 1250 });

  const result = await new LocalExecutor().run(instance);

  const receipt: { readonly amount: number; readonly note: Option<string> } =
    result.output({ amount: integer, note: optional(string) });
  assert.equal(receipt.amount, 1250);
  assert.equal(receipt.note, None);

  assert.throws(
    () => result.output({ order: integer }),
    (thrown: unknown) =>
      thrown instanceof OutputError &&
      thrown.problem.kind === "other type" &&
      thrown.problem.key === "order",
  );
})();
