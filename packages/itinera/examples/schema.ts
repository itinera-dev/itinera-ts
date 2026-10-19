import assert from "node:assert/strict";
import { z } from "itinera/schema";
import { input, type Outcome, Step, step } from "itinera/unstable";

const Order = z.object({ id: z.string(), total: z.number().nonnegative() });

@step()
class Ship extends Step {
  constructor(@input("order", Order) readonly order: z.input<typeof Order>) {
    super();
  }

  override run(): Outcome {
    return this.succeed();
  }
}

assert.ok(Order.safeParse({ id: "R-1", total: 40 }).success);
assert.ok(!Order.safeParse({ id: "R-1", total: -1 }).success);
assert.equal(new Ship({ id: "R-1", total: 40 }).order.id, "R-1");
