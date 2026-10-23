import assert from "node:assert/strict";
import { type Outcome, Step, step } from "itinera/unstable";

@step()
class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

assert.deepEqual(new Ship().run(), { kind: "success" });
