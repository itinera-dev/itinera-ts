import assert from "node:assert/strict";
import {
  Ending,
  input,
  LocalExecutor,
  RecordingReporter,
  type StepMock,
  stepMock,
  Workflow,
} from "itinera/unstable";
import { string } from "itinera/value";

class Orders extends Workflow {}

export default (async () => {
  const charge = stepMock({
    attempts: [Ending.abnormalTermination("gateway down"), Ending.success],
    asynchronous: true,
  });
  const orders = Orders.builder()
    .name("orders")
    .step(charge.builder("charge").retryBudget(1))
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

  const built: StepMock[] = [];
  class Ship extends stepMock({ attempts: [Ending.success] }) {
    constructor(...inputs: unknown[]) {
      super(...inputs);
      built.push(this);
    }
  }
  const shipping = Orders.builder()
    .name("shipping")
    .step(Ship.builder("ship").needs(input("parcel", string)))
    .build();

  await new LocalExecutor().run(shipping.instance({ parcel: "box" }));

  assert.deepEqual(
    built.map((ship) => ship.inputs),
    [["box"]],
  );
})();
