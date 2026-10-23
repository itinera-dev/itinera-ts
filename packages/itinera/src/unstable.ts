/**
 * API that may change in any release: what the specification has not
 * accepted yet, or what itinera does not fully implement yet. Each item moves
 * to the subpath of its concept once itinera implements it fully.
 *
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
 * - Steps: {@link Step}, {@link step}, {@link input}, {@link stepReporter},
 *   {@link StepReporter}, {@link Outcome}, {@link StepDescriptor} and
 *   {@link StepBuilder}, the rescue steps' {@link RescueStep},
 *   {@link rescueStep}, {@link fromRescuedStep} and
 *   {@link RescueStepBuilder}, and the requests of a
 *   step hook about its step, such as {@link stepName}, {@link attempt},
 *   {@link failureReason} and {@link error}, which move to `itinera/step`.
 * - Policies: {@link StepPolicy}, {@link WorkflowPolicy}, {@link stepPolicy},
 *   {@link workflowPolicy}, the hooks' decorators, such as
 *   {@link onStepSuccess}, what a hook returns, such as {@link OnSuccess},
 *   the requests only hooks make, such as {@link fromStep},
 *   {@link role} and {@link hookReporter}, the policies' builders,
 *   {@link StepPolicyBuilder} and {@link WorkflowPolicyBuilder}, and
 *   {@link PolicyDescriptor}, which move to `itinera/policy`.
 * - Services: {@link service}, {@link serviceType} and {@link ServiceType},
 *   and the service providers' {@link provider}, {@link Provided} and
 *   {@link providerReporter}, which move to `itinera/service`.
 * - Workflows: {@link Workflow}, {@link workflow}, {@link withStep},
 *   {@link idGenerator}, {@link fromWorkflow}, the input adapters'
 *   {@link inputAdapter}, {@link key} and {@link Supplied},
 *   {@link WorkflowBuilder}, {@link WorkflowDescriptor}, the listing's
 *   {@link ListedStep}, {@link Violations} and each {@link Violation}, the
 *   types of the request decorators, such as {@link RequestDecorator}, and
 *   of the requests a builder is given by position, such as {@link Tokens},
 *   which move to `itinera/workflow`, and {@link WorkflowInstance}, which
 *   moves to `itinera/instance`.
 * - Executors: {@link LocalExecutor}, {@link Refusal} and why `run` refuses
 *   an instance, which move to `itinera/executor`.
 * - Journeys: {@link JourneyResult}, how a journey ends, why it failed or
 *   was aborted, its {@link DataBag} and what reading it finds,
 *   {@link Read}, its output, read with {@link OutputShape} and failing with
 *   {@link OutputError}, {@link Contributor}, {@link contributor},
 *   {@link journeyId} and {@link dataBag}, which move to `itinera/journey`.
 * - Test support: {@link RecordingReporter}, {@link EntryRecordingReporter},
 *   {@link Ending}, {@link stepMock} and {@link StepMock}, which move to
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
export type {
  DispatcherFactoryFailed,
  DispatcherFailed,
  GlobalMetadataNotSet,
  InitialValues,
  InstanceRan,
  JourneyRunning,
  Refused,
} from "./executor.js";
export { LocalExecutor, Refusal } from "./executor.js";
export type {
  Abort,
  Aborted,
  Absent,
  Failed,
  Failure,
  FailureWithError,
  FailureWithReason,
  JourneyId,
  JourneyResult,
  JourneyStatus,
  JourneyWasAborted,
  OtherType,
  Output,
  OutputProblem,
  OutputShape,
  Present,
  Read,
  Succeeded,
  ValueAbsent,
  ValueOfOtherType,
} from "./journey.js";
export type { Contributor } from "./journey.js";
export {
  AbortReason,
  contributor,
  DataBag,
  dataBag,
  FailureCause,
  journeyId,
  OutputError,
} from "./journey.js";
export { None, Option, Some } from "./option.js";
export type {
  FailWorkflow,
  FinishWorkflow,
  HookDecorator,
  HookReporter,
  KeepDefault,
  Lifecycle,
  OnFailure,
  OnSuccess,
  PolicyDescriptor,
  PolicyName,
  PolicyOptions,
  Provides,
  RolesOf,
  RolesOfOne,
  StepFailureCause,
  StepPolicyBuilder,
  StepPolicyClass,
  WorkflowPolicyBuilder,
  WorkflowPolicyClass,
} from "./policy.js";
export {
  failureCause,
  fromStep,
  hookReporter,
  onStepAbnormalTermination,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
  onWorkflowFailure,
  onWorkflowSuccess,
  RetryCause,
  retryCause,
  role,
  StepHook,
  StepPolicy,
  stepPolicy,
  WorkflowHook,
  WorkflowPolicy,
  workflowPolicy,
} from "./policy.js";
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
export type {
  Provided,
  ProviderDecorator,
  ProviderName,
  ProviderOptions,
  ProviderReporter,
  ServiceType,
} from "./service.js";
export { provider, providerReporter, service, serviceType } from "./service.js";
export type {
  Fail,
  FromFailure,
  FromFailureOptions,
  GivenReason,
  Outcome,
  Reason,
  RescueOutcome,
  RescueStepBuilder,
  RescueStepClass,
  Skip,
  StepBuilder,
  StepClass,
  StepDescriptor,
  StepName,
  StepOptions,
  StepReporter,
  Success,
} from "./step.js";
export {
  Attempt,
  attempt,
  error,
  failureReason,
  fromRescuedStep,
  input,
  RescueStep,
  rescueStep,
  Step,
  step,
  stepName,
  stepReporter,
} from "./step.js";
export type {
  EndsAbnormally,
  EndsInFailure,
  EndsInSkip,
  EndsInSuccess,
  Endings,
  GlobalMetadataEntry,
  StepMockClass,
  StepMockScript,
} from "./testing.js";
export {
  Ending,
  EntryRecordingReporter,
  RecordingReporter,
  StepMock,
  stepMock,
} from "./testing.js";
export type {
  AdapterName,
  Answer,
  AttemptRequestInJourneyScope,
  Built,
  DuplicateAdapterName,
  DuplicateProviderName,
  DuplicateStepName,
  FromDataBag,
  Given,
  IdGeneratorDecorator,
  IdGeneratorKey,
  InputAdapterDecorator,
  InputAdapterForUnknownStep,
  InputAdapterOptions,
  KeyIn,
  ListedRescue,
  ListedService,
  ListedStep,
  MethodKey,
  ParameterOf,
  ParametersOf,
  Place,
  Position,
  ReadFromMetadata,
  RequestDecorator,
  RescuedStepRetried,
  ServiceNotProvided,
  ServiceProvidedTwice,
  ServiceProviderForUnknownStep,
  ServiceRequestedTwice,
  StepAdaptedTwice,
  StepHookDefinedTwice,
  Strict,
  Supplied,
  SuppliedValue,
  Token,
  Tokens,
  ValueRequestDecorator,
  Violation,
  WorkflowBuilder,
  WorkflowClass,
  WorkflowDescriptor,
  WorkflowHookDefinedTwice,
  WorkflowName,
  WorkflowOptions,
  WrongServiceType,
} from "./workflow.js";
export {
  fromWorkflow,
  idGenerator,
  inputAdapter,
  key,
  ViolationKind,
  Violations,
  withStep,
  Workflow,
  workflow,
} from "./workflow.js";
