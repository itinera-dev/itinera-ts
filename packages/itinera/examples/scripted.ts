import assert from "node:assert/strict";
import { type Contributor, contributor } from "itinera/journey";
import {
  input,
  type Outcome,
  Step,
  step,
  stepReporter,
  type StepReporter,
} from "itinera/step";
import { Level, RecordingReporter, scripted } from "itinera/unstable";
import { integer } from "itinera/value";
import { withStep, Workflow, workflow } from "itinera/workflow";

@step()
class Charge extends Step {
  override run(
    @contributor() contributor: Contributor,
    @stepReporter() reporter: StepReporter,
  ): Promise<Outcome> {
    contributor.contribute("charged", 40);
    return reporter.info("charged").then(() => this.succeed());
  }
}

@step()
class Ship extends Step {
  constructor(@input("charged", integer) readonly charged: number) {
    super();
  }

  override run(): Outcome {
    return this.succeed();
  }
}

@workflow({ name: "orders" })
@withStep(Charge, { name: "charge", retryBudget: 2 })
@withStep(Ship, { name: "ship" })
class Orders extends Workflow {}

export default (async () => {
  const recorder = new RecordingReporter();
  const instance = Orders.build().instance({}, { reporters: [recorder] });

  const run = await scripted(instance)
    .step("charge")
    .willFail("declined")
    .onRemainingAttempts()
    .willContribute("charged", 35)
    .willEmit(Level.Warning, "charged less")
    .willSucceed()
    .andStep("ship")
    .willRunForReal()
    .ensureAllScripted()
    .run();

  assert.ok(run.result.isSucceeded());
  assert.deepEqual(recorder.path, [
    "charge attempt 1 failed: declined",
    "charge retrying",
    "charge attempt 2 succeeded",
    "ship attempt 1 succeeded",
    "journey succeeded",
  ]);
  assert.equal(run.step("charge").attempts.length, 2);
  const shipped = run.step("ship").attempt(1).unwrap();
  assert.equal(shipped.input("charged", integer).option().unwrap(), 35);
})();
