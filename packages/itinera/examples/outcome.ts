import assert from "node:assert/strict";
import { input, type Outcome, Step, step } from "itinera/unstable";

@step()
class Charge extends Step {
  constructor(@input("amount") private readonly amount: number) {
    super();
  }

  override run(): Outcome {
    if (this.amount === 0) {
      return this.skipBecause("nothing to charge");
    }
    if (this.amount > 100) {
      return this.fail({
        code: "declined",
        message: "over the limit",
        details: { limit: 100 },
      });
    }
    return this.succeed();
  }
}

assert.deepEqual(new Charge(40).run(), { kind: "success" });
assert.deepEqual(new Charge(0).run(), {
  kind: "skipped",
  reason: { code: "nothing to charge" },
});
assert.deepEqual(new Charge(140).run(), {
  kind: "failure",
  reason: {
    code: "declined",
    message: "over the limit",
    details: { limit: 100 },
  },
});
