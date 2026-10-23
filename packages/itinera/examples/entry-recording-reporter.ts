import assert from "node:assert/strict";
import {
  EntryRecordingReporter,
  LocalExecutor,
  None,
  type Outcome,
  Some,
  Step,
  stepReporter,
  type StepReporter,
  Workflow,
} from "itinera/unstable";

class Lookup extends Step {
  override async run(reporter: StepReporter): Promise<Outcome> {
    await reporter.setGlobalMetadata("user_id", "u-7");
    await reporter.setGlobalMetadata("user_id", "u-8");
    return this.succeed();
  }
}

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(Lookup.builder("lookup").run(stepReporter()))
    .build();
  const recorder = new EntryRecordingReporter();
  const instance = orders.instance({}, { reporters: [recorder] });

  await new LocalExecutor().run(instance);

  assert.deepEqual(recorder.entries, [
    { key: "journey_id", value: instance.journeyId, after: None },
    { key: "user_id", value: "u-7", after: Some("attempt_started") },
    { key: "user_id", value: "u-8", after: Some("global_metadata_set") },
  ]);
  assert.equal(recorder.globalMetadata.get("user_id"), "u-8");
})();
