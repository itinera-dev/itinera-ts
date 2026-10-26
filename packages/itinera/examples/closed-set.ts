import assert from "node:assert/strict";
import type { ValueOf } from "itinera/closed-set";
import { EventKind, RescueCause } from "itinera/event";
import { AbortReason, FailureCause } from "itinera/journey";
import { RetryCause, StepHook, WorkflowHook } from "itinera/policy";

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

function stepHookOf(text: string): ValueOf<typeof StepHook> | undefined {
  return StepHook.has(text) ? text : undefined;
}

assert.equal(stepHookOf("on step retry"), StepHook.OnStepRetry);
assert.equal(stepHookOf("On Step Retry"), undefined);
