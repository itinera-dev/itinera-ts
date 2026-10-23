import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { type Outcome, Step } from "itinera/step";
import { RecordingReporter } from "itinera/unstable";
import { Workflow } from "itinera/workflow";

class Ship extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(Ship.builder("ship"))
    .build();
  const recorder = new RecordingReporter();
  const executor = new LocalExecutor();

  const result = await executor.run(
    orders.instance({}, { reporters: [recorder] }),
  );

  assert.ok(result.isSucceeded());
  assert.deepEqual(recorder.path, [
    "ship attempt 1 succeeded",
    "journey succeeded",
  ]);
})();
