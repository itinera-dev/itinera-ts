import type { PolicyName } from "../../policy.js";

/**
 * Why `run` refused an instance, before any journey and with no event.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export type Refused =
  | InstanceRan
  | JourneyRunning
  | InitialValues
  | WorkflowPolicyFailed
  | DispatcherFactoryFailed
  | DispatcherFailed
  | GlobalMetadataNotSet
  | UnexpectedResultReturned;

/**
 * The instance was handed to `run` before: an instance runs at most one
 * journey, so each journey needs an instance of its own.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface InstanceRan {
  /** Tells this refusal from the others. */
  readonly kind: "instance ran";
}

/**
 * The executor was running a journey: an executor runs one journey at a
 * time, and parallelism comes from several executors.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface JourneyRunning {
  /** Tells this refusal from the others. */
  readonly kind: "journey running";
}

/**
 * The instance's initial data holds what is not a value, or its initial
 * global metadata holds what is not a value or sets `journey_id`, which only
 * the executor sets.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface InitialValues {
  /** Tells this refusal from the others. */
  readonly kind: "initial values";
  /** The keys of the initial data whose values are not values, in order. */
  readonly initialData: readonly string[];
  /**
   * The keys of the initial global metadata whose values are not values, or
   * that are reserved, in order.
   */
  readonly initialGlobalMetadata: readonly string[];
}

/** What a refusal caused by failing custom code carries. */
interface CausedByError {
  /** What the custom code threw, as it was thrown. */
  readonly error: unknown;
  /**
   * The message of what it threw: its `message` for an `Error`, and its text
   * otherwise.
   */
  readonly errorMessage: string;
}

/**
 * One of the workflow's policies failed while it was built for the journey.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface WorkflowPolicyFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "workflow policy failed";
  /** The policy's name. */
  readonly policy: PolicyName;
}

/**
 * The executor's dispatcher factory failed while it made the journey's
 * dispatcher.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface DispatcherFactoryFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "dispatcher factory failed";
}

/**
 * The journey's dispatcher failed while the instance's reporters were added
 * to it.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface DispatcherFailed extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "dispatcher failed";
}

/**
 * A reporter, or the dispatcher, failed while the journey ID or the initial
 * global metadata was passed to the reporters.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface GlobalMetadataNotSet extends CausedByError {
  /** Tells this refusal from the others. */
  readonly kind: "global metadata not set";
}

/**
 * The dispatcher factory, or the constructor of one of the workflow's
 * policies, returned something its call cannot return, such as `undefined`,
 * which only a cast or `any` lets through. It is not a failure of that code,
 * so the refusal carries no error.
 *
 * {@includeCode ../../../examples/refusal.ts}
 */
export interface UnexpectedResultReturned {
  /** Tells this refusal from the others. */
  readonly kind: "unexpected result";
  /** What returned it. */
  readonly source:
    | {
        /** The executor's dispatcher factory returned it. */
        readonly kind: "dispatcher factory";
      }
    | {
        /** The constructor of a workflow policy returned it. */
        readonly kind: "workflow policy";
        /** The name of that policy. */
        readonly policy: PolicyName;
      };
  /** What was returned, and by whom, for the people reading it. */
  readonly message: string;
}
