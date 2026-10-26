import assert from "node:assert/strict";
import {
  Ending,
  failureCause,
  HookEnding,
  LocalExecutor,
  RecordingReporter,
  type StepPolicyMock,
  stepMock,
  stepPolicyMock,
  Workflow,
  workflowPolicyMock,
} from "itinera/unstable";

class Orders extends Workflow {}

export default (async () => {
  const built: StepPolicyMock[] = [];
  class Alarm extends stepPolicyMock({
    onStepFailure: HookEnding.failWorkflow("declined"),
  }) {
    constructor() {
      super();
      built.push(this);
    }
  }
  const audit = workflowPolicyMock();
  const charge = stepMock({ attempts: [Ending.failure("card expired")] });
  const orders = Orders.builder()
    .name("orders")
    .step(
      charge
        .builder("charge")
        .policy(
          Alarm.builder("alarm").onStepFailure("onStepFailure", failureCause()),
        ),
    )
    .policy(audit.builder("audit").onWorkflowFailure("onWorkflowFailure"))
    .build();
  const recorder = new RecordingReporter();

  const result = await new LocalExecutor().run(
    orders.instance({}, { reporters: [recorder] }),
  );

  assert.ok(result.isFailed());
  assert.deepEqual(recorder.path, [
    "charge attempt 1 failed: card expired",
    "charge given up: failure",
    "journey failed at charge: declined",
  ]);
  assert.deepEqual(
    built.map((alarm) => alarm.calls),
    [[{ hook: "on step failure", received: ["failure"] }]],
  );
})();
