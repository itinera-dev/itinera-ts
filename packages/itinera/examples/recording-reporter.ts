import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { Ending, RecordingReporter, stepMock } from "itinera/unstable";
import { Workflow } from "itinera/workflow";

class Orders extends Workflow {}

export default (async () => {
  const charge = stepMock({
    attempts: [Ending.abnormalTermination("timeout"), Ending.success],
  });
  const orders = Orders.builder()
    .name("orders")
    .step(charge.builder("charge").retryBudget(1))
    .build();
  const recorder = new RecordingReporter();
  const instance = orders.instance(
    { order: "A-1" },
    { reporters: [recorder], reportersGlobalMetadata: { tenant: "acme" } },
  );

  await new LocalExecutor().run(instance);

  assert.deepEqual(
    recorder.events.map((event) => event.kind),
    [
      "journey_started",
      "attempt_started",
      "step_abnormal_termination",
      "step_retrying",
      "attempt_started",
      "step_succeeded",
      "journey_succeeded",
    ],
  );
  assert.deepEqual(recorder.path, [
    "charge attempt 1 terminated abnormally: timeout",
    "charge retrying",
    "charge attempt 2 succeeded",
    "journey succeeded",
  ]);
  assert.deepEqual(
    [...recorder.globalMetadata],
    [
      ["journey_id", instance.journeyId],
      ["tenant", "acme"],
    ],
  );
})();
