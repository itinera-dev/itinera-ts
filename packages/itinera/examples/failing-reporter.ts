import assert from "node:assert/strict";
import { LocalExecutor } from "itinera/executor";
import { AbortReason } from "itinera/journey";
import { Ending, FailingReporter, stepMock } from "itinera/unstable";
import { Workflow } from "itinera/workflow";

class Orders extends Workflow {}

export default (async () => {
  const orders = Orders.builder()
    .name("orders")
    .step(stepMock({ attempts: [Ending.success] }).builder("charge"))
    .build();
  const reporter = new FailingReporter({
    kind: "on event",
    event: "step_succeeded",
    message: "audit log is full",
  });

  const result = await new LocalExecutor().run(
    orders.instance({}, { reporters: [reporter] }),
  );

  assert.equal(result.abort?.reason, AbortReason.ReporterFailed);
  assert.ok(reporter.failed);
  assert.deepEqual(reporter.path, ["charge attempt 1 succeeded"]);
})();
