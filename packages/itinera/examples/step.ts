import assert from "node:assert/strict";
import { type Outcome, Step, step } from "itinera/step";

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

assert.deepEqual(new Ship().run(), { kind: "success" });
