import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { None, Some } from "itinera/option";
import {
  type Outcome,
  Step,
  stepReporter,
  type StepReporter,
} from "itinera/step";
import { EntryRecordingReporter } from "itinera/unstable";
import { Workflow } from "itinera/workflow";

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
