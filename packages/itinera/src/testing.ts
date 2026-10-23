/**
 * Test support: what an application's tests use to run a workflow and check
 * what its journey did, reached only by importing this subpath, so that
 * nothing of it is reachable from the rest of itinera. It holds the
 * recording reporter and its path, fake providers, scripted runs, the
 * recorders that lend a step, a hook or an input adapter its handles outside
 * a journey, the mistake in a test, and the mocks that the conformance
 * runner and an application's tests build workflows from.
 *
 * {@includeCode ../examples/scripted.ts}
 *
 * @module
 */
export type {
  EndsAbnormally,
  EndsInFailure,
  EndsInSkip,
  EndsInSuccess,
  Endings,
  RescueEnding,
} from "./testing/ending.js";
export { Ending } from "./testing/ending.js";
export { type Emitted, Level } from "./testing/emitted.js";
export {
  EntryRecordingReporter,
  type GlobalMetadataEntry,
} from "./testing/entry-recording-reporter.js";
export {
  FailingReporter,
  type ReporterFailure,
} from "./testing/failing-reporter.js";
export { fakeProvider, type Provide } from "./testing/fake-provider.js";
export type {
  FailsWorkflow,
  FailureHookEnding,
  FinishesWorkflow,
  HookEndings,
  HookFails,
  KeepsDefault,
  WorkflowHookEnding,
} from "./testing/hook-ending.js";
export { HookEnding } from "./testing/hook-ending.js";
export { type Mistake, MistakeKind, TestMistake } from "./testing/mistake.js";
export {
  Contributions,
  HookEventReporter,
  StepEventReporter,
} from "./testing/recorders.js";
export { RecordingReporter } from "./testing/recording-reporter.js";
export type {
  RescueStepMockClass,
  RescueStepMockScript,
} from "./testing/rescue-step-mock.js";
export { RescueStepMock, rescueStepMock } from "./testing/rescue-step-mock.js";
export {
  type AttemptChoice,
  type AttemptContributing,
  type AttemptEmitting,
  type AttemptEndings,
  type AttemptScript,
  type AttemptSettingGlobalMetadata,
  type NamedStep,
  type Script,
  scripted,
  type StepScript,
} from "./testing/scripted.js";
export {
  AttemptRecord,
  ScriptedRun,
  StepRecord,
} from "./testing/scripted/record.js";
export type { StepMockClass, StepMockScript } from "./testing/step-mock.js";
export { StepMock, stepMock } from "./testing/step-mock.js";
export type {
  HookCall,
  StepPolicyMockClass,
  StepPolicyMockScript,
} from "./testing/step-policy-mock.js";
export { StepPolicyMock, stepPolicyMock } from "./testing/step-policy-mock.js";
export { TestDataBag } from "./testing/test-data-bag.js";
export type {
  WorkflowPolicyMockClass,
  WorkflowPolicyMockScript,
} from "./testing/workflow-policy-mock.js";
export {
  WorkflowPolicyMock,
  workflowPolicyMock,
} from "./testing/workflow-policy-mock.js";
