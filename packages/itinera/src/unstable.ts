/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
 * - Test support: {@link RecordingReporter}, {@link EntryRecordingReporter},
 *   {@link FailingReporter}, {@link Ending}, {@link stepMock},
 *   {@link StepMock}, {@link rescueStepMock}, {@link RescueStepMock},
 *   {@link HookEnding}, {@link stepPolicyMock},
 *   {@link StepPolicyMock}, {@link workflowPolicyMock} and
 *   {@link WorkflowPolicyMock}, which move to `itinera/testing`.
 *
 * {@includeCode ../examples/recording-reporter.ts}
 *
 * @module
 */
export * from "./testing.js";
