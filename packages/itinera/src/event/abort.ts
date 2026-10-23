import type { AbortReason } from "../journey.js";
import type { PolicyName } from "../policy.js";
import type { StepName } from "../step.js";
import type { NotAValue } from "./abort/not-a-value.js";
import type { MissingData, Requester } from "./requester.js";
import type {
  ByAdapterForKey,
  ByProvider,
  ByStep,
  ByStepHook,
  ByWorkflowHook,
} from "./source.js";

export type * from "./abort/not-a-value.js";

/**
 * Why a journey was aborted, as `journey_aborted` tells it: the abort reason,
 * the step during which it happened when there was one, and exactly the
 * details that reason carries, among them the message of the error when
 * failing custom code caused the abort. Its `reason` tells which it is.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export type JourneyAbort =
  | StepCouldNotBeBuilt
  | PolicyCouldNotBeBuilt
  | RequiredDataMissing
  | WrongType
  | InvalidLifecycle
  | NotAValue
  | HookFailed
  | ReporterFailed
  | RescueSkipped
  | ReservedMetadataKey;

/** What an abort for one reason carries, as every abort does. */
interface AbortFields<R extends AbortReason> {
  /** Why the journey was aborted. */
  readonly reason: R;
}

/**
 * A step's constructor, an input adapter resolving one of its inputs, or a
 * service provider for one of its services, failed; or the adapter supplied
 * what is not a value, or the provider returned nothing.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface StepCouldNotBeBuilt extends AbortFields<"step could not be built"> {
  /** The step's name. */
  readonly step: StepName;
  /**
   * What failed: the step's own constructor, an input adapter with the key of
   * the input it was resolving, or a service provider.
   */
  readonly source: ByStep | ByAdapterForKey | ByProvider;
  /** The message of the error, when a constructor, adapter or provider failed. */
  readonly errorMessage?: string;
}

/**
 * A step policy failed while it was built for an attempt.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface PolicyCouldNotBeBuilt extends AbortFields<"policy could not be built"> {
  /** The name of the step being attempted. */
  readonly step: StepName;
  /** The policy's name. */
  readonly policy: PolicyName;
  /** The message of the error. */
  readonly errorMessage: string;
}

/**
 * A required request has no value.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface RequiredDataMissing extends AbortFields<"required data missing"> {
  /** The name of the step the request was for, except for a workflow hook. */
  readonly step?: StepName;
  /** What was requested, and by whom. */
  readonly missing: MissingData;
}

/**
 * A requested value has the wrong type.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface WrongType extends AbortFields<"wrong type"> {
  /** The name of the step the request was for, except for a workflow hook. */
  readonly step?: StepName;
  /** The key that was requested. */
  readonly key: string;
  /** Who requested it. */
  readonly requester: Requester;
}

/**
 * A hook returned a lifecycle it may not return.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface InvalidLifecycle extends AbortFields<"invalid lifecycle"> {
  /** The name of the step the hook acts on, except for a workflow hook. */
  readonly step?: StepName;
}

/**
 * A hook, or a role operation it called, failed.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface HookFailed extends AbortFields<"hook failed"> {
  /** The name of the step the hook acts on, except for a workflow hook. */
  readonly step?: StepName;
  /** The message of the error. */
  readonly errorMessage: string;
}

/**
 * A reporter, or a dispatcher while dispatching, failed.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ReporterFailed extends AbortFields<"reporter failed"> {
  /** The name of the step during which it happened, if any. */
  readonly step?: StepName;
  /** The message of the error. */
  readonly errorMessage: string;
}

/**
 * A rescue step reported Skipped.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface RescueSkipped extends AbortFields<"rescue skipped"> {
  /** The rescue step's name. */
  readonly step: StepName;
}

/**
 * A step, a hook or a service provider set global metadata under
 * `journey_id`, the journey ID's own key, which only the executor sets.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface ReservedMetadataKey extends AbortFields<"reserved metadata key"> {
  /** The name of the step during which it was set, except for a workflow hook. */
  readonly step?: StepName;
  /** The key it was set under, the only one reserved. */
  readonly key: "journey_id";
  /** Who set it. */
  readonly source: ByStep | ByStepHook | ByWorkflowHook | ByProvider;
}
