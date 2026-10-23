import assert from "node:assert/strict";
import {
  integer,
  LocalExecutor,
  None,
  type Option,
  optional,
  OutputError,
  Step,
  string,
  Workflow,
} from "itinera/unstable";

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
