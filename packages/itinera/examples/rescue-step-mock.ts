import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { failureReason } from "itinera/step";
import {
  Ending,
  RecordingReporter,
  type RescueStepMock,
  rescueStepMock,
  stepMock,
} from "itinera/testing";
import { Workflow } from "itinera/workflow";

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
