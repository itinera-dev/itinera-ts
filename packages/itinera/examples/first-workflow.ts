import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { type Contributor, contributor } from "itinera/journey";
import { input, type Outcome, Step, step } from "itinera/step";
import { integer, string } from "itinera/value";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Charge extends Step {
  constructor(@input("amount", integer) private readonly amount: number) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    if (this.amount <= 0) return this.fail("nothing to charge");
    contributor.contribute("receipt", `charged ${String(this.amount)}`);
    return this.succeed();
  }
}

@step()
class Ship extends Step {
  constructor(@input("receipt", string) private readonly receipt: string) {
    super();
  }

  override run(@contributor() contributor: Contributor): Outcome {
    contributor.contribute("shipped", `after ${this.receipt}`);
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", retryBudget: 2 })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {}

export default (async () => {
  const executor = new LocalExecutor();
  const orders = Orders.build();

  const paid = await executor.run(orders.instance({ amount: 40 }));
  assert.ok(paid.isSucceeded());
  assert.deepEqual(paid.output({ shipped: string }), {
    shipped: "after charged 40",
  });

  const free = await executor.run(orders.instance({ amount: 0 }));
  assert.ok(free.isFailed());
  assert.equal(free.failure?.cause, "retries exhausted");
  assert.deepEqual(free.failure.reason, { code: "nothing to charge" });
})();
