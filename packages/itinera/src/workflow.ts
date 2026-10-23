/**
 * Workflows: the base class every workflow extends, how its steps are
 * declared, what a workflow and its parts are called, and how a workflow is
 * described to the executor.
 *
 * {@includeCode ../examples/workflow.ts}
 *
 * @module
 */
export {
  withStep,
  workflow,
  type WorkflowClass,
  type WorkflowOptions,
} from "./workflow/decorators.js";
export {
  inputAdapter,
  type InputAdapterDecorator,
  type InputAdapterOptions,
  key,
} from "./workflow/adapter.js";
export type {
  FromDataBag,
  Supplied,
  SuppliedValue,
} from "./workflow/adapter/supplied.js";
export type {
  Answer,
  KeyIn,
  ParameterOf,
  Place,
  ReadFromMetadata,
  RequestDecorator,
  Strict,
  ValueRequestDecorator,
} from "./declaration/parameter.js";
export type {
  Given,
  MethodKey,
  ParametersOf,
  Token,
  Tokens,
} from "./declaration/token.js";
export type { WorkflowBuilder } from "./workflow/builder.js";
export {
  idGenerator,
  type IdGeneratorDecorator,
  type IdGeneratorKey,
} from "./workflow/id-generator.js";
export { fromWorkflow } from "./workflow/request.js";
export type { WorkflowDescriptor } from "./workflow/descriptor.js";
export type {
  ListedRescue,
  ListedService,
  ListedStep,
  Position,
} from "./workflow/listing.js";
export type { AdapterName, Built, WorkflowName } from "./workflow/names.js";
export type {
  AttemptRequestInJourneyScope,
  DuplicateAdapterName,
  DuplicateProviderName,
  DuplicateStepName,
  InputAdapterForUnknownStep,
  RescuedStepRetried,
  ServiceNotProvided,
  ServiceProvidedTwice,
  ServiceProviderForUnknownStep,
  ServiceRequestedTwice,
  StepAdaptedTwice,
  StepHookDefinedTwice,
  WorkflowHookDefinedTwice,
  WrongServiceType,
  Violation,
} from "./workflow/violation.js";
export { ViolationKind, Violations } from "./workflow/violation.js";
export { Workflow } from "./workflow/base.js";
