import type { ValueOf } from "../closed-set.js";
import { closedSet } from "../closed-set/declare.js";
import type { FailureCause } from "../journey.js";
import type { PolicyName, RetryCause, StepHook } from "../policy.js";
import type { Reason, StepName } from "../step.js";
import type { FixedFields, StepFields } from "./fields.js";

export type * from "./decision/journey-failed.js";

/**
 * Who decided what a decision records: `"default"`, the executor's own
 * rule, or the policy and hook whose returned lifecycle decided it.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export type DecidedBy<H extends StepHook = StepHook> =
  "default" | DecidingHook<H>;

/**
 * The policy and the step hook whose returned lifecycle decided something.
 * Only step hooks return lifecycles, so only they decide.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface DecidingHook<H extends StepHook = StepHook> {
  /** The policy's name. */
  readonly policy: PolicyName;
  /** The hook. */
  readonly hook: H;
}

/**
 * The step hooks that give a step up when they return `FailWorkflow`.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export type GiveUpHook = "on step retry" | "on step abnormal termination";

/**
 * How the attempt of a step that is rescued failed.
 *
 * {@includeCode ../../examples/closed-set.ts}
 */
export const RescueCause = closedSet({
  /** The attempt reported a failure. */
  Failure: "failure",
  /** The attempt ended in an abnormal termination. */
  AbnormalTermination: "abnormal termination",
});

/**
 * One of the values of {@link RescueCause}.
 *
 * {@includeCode ../../examples/closed-set.ts}
 */
export type RescueCause = ValueOf<typeof RescueCause>;

/**
 * The executor decided to attempt a step again. Its own rule always decides
 * it.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface StepRetrying extends StepFields<"step_retrying"> {
  /** How the attempt failed. */
  readonly cause: RetryCause;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * The executor decided to rescue a step: its rescue step runs, then the step
 * is attempted again. Its own rule always decides it.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface StepRescuing extends StepFields<"step_rescuing"> {
  /** How the attempt failed. */
  readonly cause: RescueCause;
  /** The name of the step's rescue step. */
  readonly rescue: StepName;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * A step's rescue step succeeded, and the executor decided to attempt the
 * step again. Its own rule always decides it.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface StepRescued extends StepFields<"step_rescued"> {
  /** The name of the step's rescue step. */
  readonly rescue: StepName;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * The executor decided not to attempt a step again: it ends as failed. Its
 * attempt is the step's last.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export type StepGivenUp = StepGivenUpByDefault | StepGivenUpByHook;

/**
 * A step given up by the executor's own rule.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface StepGivenUpByDefault extends StepFields<"step_given_up"> {
  /** Why it will not be attempted again. */
  readonly cause: Exclude<FailureCause, typeof FailureCause.FailWorkflow>;
  /** Never present: only `FailWorkflow` carries a reason. */
  readonly reason?: never;
  /** Who decided it. */
  readonly decidedBy: "default";
}

/**
 * A step given up because a hook returned `FailWorkflow`.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface StepGivenUpByHook extends StepFields<"step_given_up"> {
  /** Why it will not be attempted again. */
  readonly cause: typeof FailureCause.FailWorkflow;
  /** The reason `FailWorkflow` carried. */
  readonly reason: Reason;
  /** The hook that returned it. */
  readonly decidedBy: DecidingHook<GiveUpHook>;
}

/**
 * The executor decided that the journey succeeds: no step was left, or a
 * hook returned `FinishWorkflow`.
 *
 * {@includeCode ../../examples/decision.ts}
 */
export interface JourneySucceeded extends FixedFields<"journey_succeeded"> {
  /** Who decided it. */
  readonly decidedBy: DecidedBy<typeof StepHook.OnStepSuccess>;
}
