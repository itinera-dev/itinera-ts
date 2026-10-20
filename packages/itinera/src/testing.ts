/**
 * Test support: what an application's tests use to run a workflow and check
 * what its journey did, reached only by importing this module.
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
export {
  EntryRecordingReporter,
  type GlobalMetadataEntry,
} from "./testing/entry-recording-reporter.js";
export {
  FailingReporter,
  type ReporterFailure,
} from "./testing/failing-reporter.js";
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
export { RecordingReporter } from "./testing/recording-reporter.js";
export type {
  RescueStepMockClass,
  RescueStepMockScript,
} from "./testing/rescue-step-mock.js";
export { RescueStepMock, rescueStepMock } from "./testing/rescue-step-mock.js";
export type { StepMockClass, StepMockScript } from "./testing/step-mock.js";
export { StepMock, stepMock } from "./testing/step-mock.js";
export type {
  HookCall,
  StepPolicyMockClass,
  StepPolicyMockScript,
} from "./testing/step-policy-mock.js";
export { StepPolicyMock, stepPolicyMock } from "./testing/step-policy-mock.js";
export type {
  WorkflowPolicyMockClass,
  WorkflowPolicyMockScript,
} from "./testing/workflow-policy-mock.js";
export {
  WorkflowPolicyMock,
  workflowPolicyMock,
} from "./testing/workflow-policy-mock.js";
