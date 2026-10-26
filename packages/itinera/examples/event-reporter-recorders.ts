import assert from "node:assert/strict";
import { None, Some } from "itinera/option";
import {
  type HookReporter,
  hookReporter,
  onWorkflowSuccess,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/policy";
import {
  type Outcome,
  Step,
  step,
  stepReporter,
  type StepReporter,
} from "itinera/step";
import { HookEventReporter, Level, StepEventReporter } from "itinera/unstable";

@step()
class Ship extends Step {
  override async run(@stepReporter() reporter: StepReporter): Promise<Outcome> {
    await reporter.info("parcel handed over", { carrier: "post" });
    await reporter.setGlobalMetadata("carrier", "post");
    return this.succeed();
  }
}

@workflowPolicy({ name: "audit" })
class Audit extends WorkflowPolicy {
  @onWorkflowSuccess()
  async audited(@hookReporter() reporter: HookReporter): Promise<void> {
    await reporter.warning("audited late");
  }
}

export default (async () => {
  const recorder = new StepEventReporter();
  await new Ship().run(recorder.reporter);
  assert.deepEqual(recorder.emitted, [
    {
      level: Level.Info,
      message: "parcel handed over",
      data: Some({ carrier: "post" }),
    },
  ]);
  assert.deepEqual([...recorder.globalMetadata], [["carrier", "post"]]);

  const hook = new HookEventReporter();
  await new Audit().audited(hook.reporter);
  assert.deepEqual(hook.emitted, [
    { level: Level.Warning, message: "audited late", data: None },
  ]);

  const failing = StepEventReporter.failing();
  await assert.rejects(new Ship().run(failing.reporter));
  assert.deepEqual(failing.emitted, []);
})();
