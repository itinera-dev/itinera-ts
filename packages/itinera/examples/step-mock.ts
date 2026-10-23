import assert from "node:assert/strict";
import {
  Ending,
  LocalExecutor,
  RecordingReporter,
  stepMock,
  Workflow,
} from "itinera/unstable";

class Orders extends Workflow {}

export default (async () => {
  const charge = stepMock({
    attempts: [Ending.abnormalTermination("gateway down"), Ending.success],
    asynchronous: true,
  });
  const orders = Orders.builder()
    .name("orders")
    .step(charge, { name: "charge", retryBudget: 1 })
    .build();
  const recorder = new RecordingReporter();

  const result = await new LocalExecutor().run(
    orders.instance({}, { reporters: [recorder] }),
  );

  assert.ok(result.isSucceeded());
  assert.deepEqual(recorder.path, [
    "charge attempt 1 terminated abnormally: gateway down",
    "charge retrying",
    "charge attempt 2 succeeded",
    "journey succeeded",
  ]);
})();
