/**
 * Journeys: what one run of a workflow is called, and how it ends.
 *
 * @module
 */
import { closedSet, type ValueOf } from "./closed-set.js";

declare const journeyId: unique symbol;

/**
 * The ID of a journey, which every event of the journey carries. itinera
 * gives one to every workflow instance, from the workflow's ID generator or a
 * random UUID, so a plain string is not mistaken for one.
 *
 * {@includeCode ../examples/names.ts}
 */
export type JourneyId = string & {
  /** Marks the string as a journey ID made by itinera. */
  readonly [journeyId]: true;
};

/**
 * Why a journey was aborted: something illegal happened, typically code that
 * did not handle an error as it should. Each value is written as the
 * specification names it, such as `"reporter failed"`.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export const AbortReason = closedSet({
  /** A step's constructor, input adapter or service provider failed. */
  StepCouldNotBeBuilt: "step could not be built",
  /** A step policy failed while it was built for an attempt. */
  PolicyCouldNotBeBuilt: "policy could not be built",
  /** A required request has no value. */
  RequiredDataMissing: "required data missing",
  /** A requested value has the wrong type. */
  WrongType: "wrong type",
  /** A hook returned a lifecycle it may not return. */
  InvalidLifecycle: "invalid lifecycle",
  /** A step, hook or service provider gave something that is not a value. */
  NotAValue: "not a value",
  /** A hook, or a role operation it called, failed. */
  HookFailed: "hook failed",
  /** A reporter, or a dispatcher while dispatching, failed. */
  ReporterFailed: "reporter failed",
  /** A rescue step reported Skipped. */
  RescueSkipped: "rescue skipped",
  /** A step, hook or service provider set global metadata under `journey_id`. */
  ReservedMetadataKey: "reserved metadata key",
});

/** One of the values of {@link AbortReason}. */
export type AbortReason = ValueOf<typeof AbortReason>;

/**
 * Why a journey failed, or why a step will not be attempted again. Each value
 * is written as the specification names it, such as `"retries exhausted"`.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export const FailureCause = closedSet({
  /** The last attempt reported a failure, and the step has no retry budget. */
  Failure: "failure",
  /** The step's retry budget, greater than 0, is spent. */
  RetriesExhausted: "retries exhausted",
  /** The last attempt ended in an abnormal termination that is not retried. */
  AbnormalTermination: "abnormal termination",
  /** A hook returned `FailWorkflow`. */
  FailWorkflow: "FailWorkflow",
});

/** One of the values of {@link FailureCause}. */
export type FailureCause = ValueOf<typeof FailureCause>;
