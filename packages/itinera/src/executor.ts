/**
 * Executors, which run journeys, and what `run` rejects with when it refuses
 * an instance.
 *
 * {@includeCode ../examples/local-executor.ts}
 *
 * @module itinera/executor
 */
export type {
  DispatcherFactoryFailed,
  DispatcherFailed,
  GlobalMetadataNotSet,
  InitialValues,
  InstanceRan,
  JourneyRunning,
  Refused,
  WorkflowPolicyFailed,
} from "./executor/refusal.js";
export { LocalExecutor } from "./executor/local.js";
export { Refusal } from "./executor/refusal.js";
