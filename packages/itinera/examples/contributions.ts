import assert from "node:assert/strict";
import { type Contributor, contributor } from "itinera/journey";
import { type Outcome, Step, step } from "itinera/step";
import { Contributions } from "itinera/unstable";
import { integer } from "itinera/value";

@step()
class Charge extends Step {
  override run(@contributor() contributor: Contributor): Outcome {
    contributor.contribute("charged", 40);
    return this.succeed();
  }
}

const contributions = new Contributions();

new Charge().run(contributions.contributor);

assert.deepEqual(contributions.keys(), ["charged"]);
assert.equal(contributions.read("charged", integer).option().unwrap(), 40);
