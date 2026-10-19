import type { FailureCause } from "../journey.js";
import type { Reason } from "../step.js";

/**
 * Why a journey failed, as its result tells it: its cause, and the reason a
 * step or hook gave or the error that ended the last attempt, as the cause
 * allows.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export type Failure = FailureWithReason | FailureWithError;

/**
 * A failure explained by a reason: the last attempt reported a failure, or a
 * hook returned `FailWorkflow`.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface FailureWithReason {
  /** Why the journey failed. */
  readonly cause:
    | typeof FailureCause.Failure
    | typeof FailureCause.RetriesExhausted
    | typeof FailureCause.FailWorkflow;
  /** The reason the step or the hook gave. */
  readonly reason: Reason;
  /** Never present: a reason explains this failure, not an error. */
  readonly error?: never;
  /** Never present: a reason explains this failure, not an error. */
  readonly errorMessage?: never;
}

/**
 * A failure explained by an error: the last attempt ended in an abnormal
 * termination that was not retried.
 *
 * {@includeCode ../../examples/journey-result.ts}
 */
export interface FailureWithError {
  /** Why the journey failed. */
  readonly cause:
    | typeof FailureCause.AbnormalTermination
    | typeof FailureCause.RetriesExhausted;
  /** What the step threw, as it was thrown. */
  readonly error: unknown;
  /**
   * The message of what the step threw: its `message` for an `Error`, and
   * its text otherwise.
   */
  readonly errorMessage: string;
  /** Never present: an error explains this failure, not a reason. */
  readonly reason?: never;
}
