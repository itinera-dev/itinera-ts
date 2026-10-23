import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { DeclaredProvider } from "../service/provider.js";
import type { StepDescriptor } from "../step.js";
import { closedSet, type ValueOf } from "../closed-set.js";
import type { DeclaredAdapter } from "./adapter.js";
import {
  adaptersForUnknownSteps,
  type DuplicateAdapterName,
  duplicateAdapterNames,
  type InputAdapterForUnknownStep,
  type StepAdaptedTwice,
  stepsAdaptedTwice,
} from "./violation/adapters.js";
import {
  type StepHookDefinedTwice,
  stepHooksDefinedTwice,
  type WorkflowHookDefinedTwice,
  workflowHooksDefinedTwice,
} from "./violation/hooks.js";
import {
  type DuplicateProviderName,
  providerViolations,
  type ServiceProvidedTwice,
  type ServiceProviderForUnknownStep,
} from "./violation/providers.js";
import type { AttemptRequestInJourneyScope } from "./violation/scope.js";
import {
  type ServiceNotProvided,
  type ServiceRequestedTwice,
  serviceViolations,
  type WrongServiceType,
} from "./violation/services.js";
import {
  type DuplicateStepName,
  duplicateStepNames,
  type RescuedStepRetried,
  rescuedStepsRetried,
} from "./violation/steps.js";

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
};

/**
 * The kinds of violation: what can be wrong in how a workflow is put
 * together, found before any journey. Each value is written as the
 * specification names it, such as `"duplicate step name"`. A policy whose
 * roles the workflow does not provide does not compile, and the local
 * executor accepts every execution mode, so neither has a kind.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export const ViolationKind = closedSet({
  /** Two policies attached to one step, or to the workflow, define the same hook. */
  HookDefinedTwice: "hook defined twice",
  /** Two steps of one workflow have the same name. */
  DuplicateStepName: "duplicate step name",
  /** Two input adapters are attached to the same step. */
  StepAdaptedTwice: "step adapted twice",
  /** Two input adapters of one workflow have the same name. */
  DuplicateAdapterName: "duplicate adapter name",
  /** An input adapter is attached to a step or rescue step the workflow does not have. */
  InputAdapterForUnknownStep: "input adapter for unknown step",
  /** A step has both a rescue step and a retry budget greater than 0. */
  RescuedStepRetried: "rescued step retried",
  /** A step requests a service that no provider serves for it. */
  ServiceNotProvided: "service not provided",
  /** A step requests the same key twice among its services. */
  ServiceRequestedTwice: "service requested twice",
  /** Two providers of one key are attached to the same step, or to no step. */
  ServiceProvidedTwice: "service provided twice",
  /** Two service providers of one workflow have the same name. */
  DuplicateProviderName: "duplicate provider name",
  /** A service provider is attached to a step or rescue step the workflow does not have. */
  ServiceProviderForUnknownStep: "service provider for unknown step",
  /** The provider serving a step supplies another type than the step requests. */
  WrongServiceType: "wrong service type",
  /** A service provider of journey scope requests the step's name or the attempt. */
  AttemptRequestInJourneyScope: "attempt request in journey scope",
});

/** One of the values of {@link ViolationKind}. */
export type ViolationKind = ValueOf<typeof ViolationKind>;

/**
 * One thing wrong in how a workflow is put together, with what it concerns,
 * told apart by its `kind`.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export type Violation =
  | StepHookDefinedTwice
  | WorkflowHookDefinedTwice
  | DuplicateStepName
  | StepAdaptedTwice
  | DuplicateAdapterName
  | InputAdapterForUnknownStep
  | RescuedStepRetried
  | ServiceNotProvided
  | ServiceRequestedTwice
  | ServiceProvidedTwice
  | DuplicateProviderName
  | ServiceProviderForUnknownStep
  | WrongServiceType
  | AttemptRequestInJourneyScope;

/**
 * Every violation found in how a workflow is put together, thrown when its
 * class is defined, or when its builder builds it, before any journey.
 *
 * Its message lists each violation on a line of its own, such as
 * `duplicate step name: charge`.
 *
 * {@includeCode ../../examples/violations.ts}
 */
export class Violations extends Error {
  /** Every violation found, at least one, in the order found. */
  readonly violations: readonly [Violation, ...Violation[]];

  constructor(violations: readonly [Violation, ...Violation[]]) {
    super(violations.map(line).join("\n"));
    this.name = "Violations";
    this.violations = violations;
  }
}

/** What a workflow is put together from, as admission checks it. */
export interface Checked {
  readonly steps: readonly StepDescriptor[];
  readonly policies: readonly PolicyDescriptor[];
  readonly adapters: readonly DeclaredAdapter[];
  readonly providers: readonly DeclaredProvider[];
}

/** Every violation in how the workflow `checked` is put together, in order. */
export function violationsOf(checked: Checked): Violation[] {
  const { steps, policies, adapters, providers } = checked;
  return [
    ...duplicateStepNames(steps),
    ...rescuedStepsRetried(steps),
    ...steps.flatMap(stepHooksDefinedTwice),
    ...workflowHooksDefinedTwice(policies),
    ...duplicateAdapterNames(adapters),
    ...adaptersForUnknownSteps(steps, adapters),
    ...stepsAdaptedTwice(steps, adapters),
    ...serviceViolations(steps, providers),
    ...providerViolations(steps, providers),
  ];
}

function line(violation: Violation): string {
  return `${violation.kind}: ${subjectOf(violation)}`;
}

function subjectOf(violation: Violation): string {
  switch (violation.kind) {
    case "hook defined twice":
      return "step" in violation
        ? `${violation.hook} on step ${violation.step}`
        : violation.hook;
    case "duplicate step name":
    case "rescued step retried":
    case "step adapted twice":
      return violation.step;
    case "duplicate adapter name":
      return violation.adapter;
    case "input adapter for unknown step":
      return `${violation.adapter} on ${violation.step}`;
    case "service not provided":
      return `${violation.key} for ${violation.step}`;
    case "service requested twice":
      return `${violation.key} by ${violation.step}`;
    case "service provided twice":
      return violation.step === undefined
        ? violation.key
        : `${violation.key} for ${violation.step}`;
    case "duplicate provider name":
    case "attempt request in journey scope":
      return violation.provider;
    case "service provider for unknown step":
      return `${violation.provider} on ${violation.step}`;
    case "wrong service type":
      return `${violation.provider} for ${violation.key} of ${violation.step}`;
  }
}
