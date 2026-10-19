import assert from "node:assert/strict";
import {
  type Contributor,
  contributor,
  type Outcome,
  Step,
  step,
} from "itinera/unstable";

@step()
class Charge extends Step {
  override run(@contributor() contributor: Contributor): Outcome {
    contributor.contribute("charged", 40);
    return this.succeed();
  }
}

const contributed = new Map<string, unknown>();
const recording: Contributor = {
  contribute: (key, value) => {
    contributed.set(key, value);
  },
};

new Charge().run(recording);
assert.deepEqual([...contributed], [["charged", 40]]);
