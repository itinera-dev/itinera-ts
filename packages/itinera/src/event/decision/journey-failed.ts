import type { FailureCause } from "../../journey.js";
import type { Reason, StepName } from "../../step.js";
import type { DecidingHook } from "../decision.js";
import type { FixedFields } from "../fields.js";

/**
 * The executor decided that the journey fails. It names the step that
 * failed, or whose hook returned `FailWorkflow`, but no attempt.
 *
 * {@includeCode ../../../examples/decision.ts}
 */
export type JourneyFailed =
  JourneyFailedWithReason | JourneyFailedWithError | JourneyFailedByHook;

/** What every `journey_failed` event carries. */
interface Failed extends FixedFields<"journey_failed"> {
  /** The name of the step that failed. */
  readonly step: StepName;
}

/**
 * The journey failed because its step's last attempt reported a failure,
 * with no retry budget left.
 *
 * {@includeCode ../../../examples/decision.ts}
 */
export interface JourneyFailedWithReason extends Failed {
  /** Why it failed. */
  readonly cause:
    typeof FailureCause.Failure | typeof FailureCause.RetriesExhausted;
  /** The reason the last attempt reported. */
  readonly reason: Reason;
  /** Never present: the last attempt reported a failure, with no error. */
  readonly errorMessage?: never;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * The journey failed because its step's last attempt ended in an abnormal
 * termination that was not retried.
 *
 * {@includeCode ../../../examples/decision.ts}
 */
export interface JourneyFailedWithError extends Failed {
  /** Why it failed. */
  readonly cause:
    | typeof FailureCause.AbnormalTermination
    | typeof FailureCause.RetriesExhausted;
  /** The message of the error that ended the last attempt. */
  readonly errorMessage: string;
  /** Never present: the last attempt ended abnormally, with no reason. */
  readonly reason?: never;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * The journey failed because a hook of the step returned `FailWorkflow`.
 *
 * {@includeCode ../../../examples/decision.ts}
 */
export interface JourneyFailedByHook extends Failed {
  /** Why it failed. */
  readonly cause: typeof FailureCause.FailWorkflow;
  /** The reason `FailWorkflow` carried. */
  readonly reason: Reason;
  /** Never present: a hook failed the journey, with no error. */
  readonly errorMessage?: never;
  /** The hook that returned it. */
  readonly decidedBy: DecidingHook;
}
