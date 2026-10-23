import assert from "node:assert/strict";
import {
  AbortReason,
  EventKind,
  FailureCause,
  RescueCause,
  RetryCause,
  StepHook,
  WorkflowHook,
} from "itinera/unstable";

assert.equal(EventKind.StepFailed, "step_failed");
assert.equal(AbortReason.ReporterFailed, "reporter failed");
assert.equal(FailureCause.RetriesExhausted, "retries exhausted");
assert.equal(RetryCause.AbnormalTermination, "abnormal termination");
assert.equal(RescueCause.Failure, "failure");
assert.equal(WorkflowHook.OnWorkflowFailure, "on workflow failure");
assert.deepEqual(StepHook.values, [
  "on step success",
  "on step failure",
  "on step retry",
  "on step abnormal termination",
]);
assert.ok(StepHook.has("on step retry"));
assert.ok(!StepHook.has("On Step Retry"));
