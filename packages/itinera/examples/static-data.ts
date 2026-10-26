import assert from "node:assert/strict";
import { type Outcome, Step, step } from "itinera/step";

@step()
class Ship extends Step {
  static parcels(grams: number): number {
    return Math.ceil(grams / 20_000);
  }

  override run(): Outcome {
    return this.succeed();
  }
}

class Counted extends Step {
  static shipped = 0;

  override run(): Outcome {
    Counted.shipped += 1;
    return this.succeed();
  }
}

assert.equal(Ship.parcels(45_000), 3);
assert.throws(() => {
  // @ts-expect-error: a step keeps no static data
  Counted.builder("counted");
}, /step Counted keeps static data, which everything built from it would share: shipped/);
