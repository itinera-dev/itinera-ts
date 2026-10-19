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
} from "./testing/ending.js";
export { Ending } from "./testing/ending.js";
export {
  EntryRecordingReporter,
  type GlobalMetadataEntry,
} from "./testing/entry-recording-reporter.js";
export { RecordingReporter } from "./testing/recording-reporter.js";
export type { StepMockClass, StepMockScript } from "./testing/step-mock.js";
export { StepMock, stepMock } from "./testing/step-mock.js";
