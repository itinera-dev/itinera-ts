import assert from "node:assert/strict";
import {
  Ending,
  failureReason,
  LocalExecutor,
  RecordingReporter,
  type RescueStepMock,
  rescueStepMock,
  stepMock,
  Workflow,
} from "itinera/unstable";

class Orders extends Workflow {}

export default (async () => {
  const charge = stepMock({
    attempts: [Ending.failure("expired"), Ending.success],
  });
  const built: RescueStepMock[] = [];
  class Renew extends rescueStepMock({ attempts: [Ending.success] }) {
    constructor(...needs: unknown[]) {
      super(...needs);
      built.push(this);
    }
  }
  const orders = Orders.builder()
    .name("orders")
    .step(
      charge.builder("charge").rescue(Renew.builder().needs(failureReason())),
    )
    .build();
  const recorder = new RecordingReporter();

  const result = await new LocalExecutor().run(
    orders.instance({}, { reporters: [recorder] }),
  );

  assert.ok(result.isSucceeded());
  assert.deepEqual(recorder.path, [
    "charge attempt 1 failed: expired",
    "charge rescuing with charge_rescue",
    "charge_rescue attempt 1 succeeded",
    "charge rescued by charge_rescue",
    "charge attempt 2 succeeded",
    "journey succeeded",
  ]);
  assert.deepEqual(
    built.map((renew) => renew.inputs),
    [[{ code: "expired" }]],
  );
})();
