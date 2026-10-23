/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
 * - Values: {@link Value}, {@link PlainValue}, {@link SerialisesItself} and
 *   {@link AsValue}, which move to `itinera/value`.
 * - `Option`, `Some` and `None`, as `ts-results-es` defines them, which move
 *   to `itinera/option`. An optional request and a typed read of the data bag
 *   give an `Option`: `Some(value)` when present, a stored `null` included,
 *   and `None` only when absent. Import them only from itinera: an ESM
 *   application importing them from `ts-results-es` directly gets a second
 *   copy of their types, which does not type-check against itinera's.
 * - Events: {@link Event}, every kind of event and what each carries, which
 *   move to `itinera/event`.
 * - Reporters and dispatchers: {@link Reporter}, {@link Dispatcher},
 *   {@link DispatcherFactory}, {@link DefaultDispatcher},
 *   {@link DefaultDispatcherFactory} and {@link DebugReporter}, which move to
 *   `itinera/report`.
 * - Steps: {@link Step}, {@link step}, {@link Outcome} and
 *   {@link StepDescriptor}, which move to `itinera/step`.
 * - Workflows: {@link Workflow}, {@link workflow}, {@link withStep},
 *   {@link idGenerator}, {@link WorkflowDescriptor} and {@link Violations},
 *   which move to `itinera/workflow`, and {@link WorkflowInstance}, which
 *   moves to `itinera/instance`.
 * - Test support: {@link RecordingReporter}, which moves to
 *   `itinera/testing`.
 * - The names and closed sets events carry, which move to the subpaths of
 *   their concepts: `itinera/journey`, `itinera/workflow`, `itinera/step`,
 *   `itinera/policy` and `itinera/service`.
 *
 * {@includeCode ../examples/option.ts}
 *
 * @module
 */
export type { ClosedSet, EveryValue, ValueOf } from "./closed-set.js";
export type * from "./event.js";
export { EventKind, RescueCause } from "./event.js";
export type { JourneyId } from "./journey.js";
export { AbortReason, FailureCause } from "./journey.js";
export { None, Option, Some } from "./option.js";
export type {
  FailWorkflow,
  FinishWorkflow,
  Lifecycle,
  PolicyName,
} from "./policy.js";
export { RetryCause, StepHook, WorkflowHook } from "./policy.js";
export type {
  InstanceOptions,
  ValuesByKey,
  WorkflowInstance,
} from "./instance.js";
export type {
  Dispatcher,
  DispatcherFactory,
  Reporter,
  ReporterClass,
} from "./report.js";
export {
  DebugReporter,
  DefaultDispatcher,
  DefaultDispatcherFactory,
} from "./report.js";
export type { ProviderName } from "./service.js";
export type {
  Outcome,
  Reason,
  StepClass,
  StepDescriptor,
  StepName,
  StepOptions,
  Success,
} from "./step.js";
export { Attempt, Step, step } from "./step.js";
export { RecordingReporter } from "./testing.js";
export type { AsValue, PlainValue, SerialisesItself, Value } from "./value.js";
export type {
  AdapterName,
  Built,
  DuplicateStepName,
  IdGeneratorDecorator,
  Violation,
  WorkflowDescriptor,
  WorkflowName,
  WorkflowOptions,
} from "./workflow.js";
export {
  idGenerator,
  ViolationKind,
  Violations,
  withStep,
  Workflow,
  workflow,
} from "./workflow.js";
