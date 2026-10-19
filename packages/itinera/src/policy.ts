/**
 * Policies: what a policy is called, its hooks, and the lifecycles a hook
 * returns.
 *
 * @module
 */
import { closedSet, type ValueOf } from "./closed-set.js";
import type { Reason } from "./step.js";

declare const policyName: unique symbol;

/**
 * The name of a policy: a string that is never empty, checked when the
 * workflow is declared, so a plain string is not mistaken for one.
 *
 * {@includeCode ../examples/names.ts}
 */
export type PolicyName = string & {
  /** Marks the string as a policy name made by itinera. */
  readonly [policyName]: true;
};

/**
 * The hooks of a step policy, called around a step's attempts. Each value is
 * written as the specification names it, such as `"on step retry"`.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export const StepHook = closedSet({
  /** Called after an attempt reported Success. */
  OnStepSuccess: "on step success",
  /** Called once a step is given up and ends as failed. */
  OnStepFailure: "on step failure",
  /** Called before a step is attempted again. */
  OnStepRetry: "on step retry",
  /** Called after an attempt ended in an abnormal termination. */
  OnStepAbnormalTermination: "on step abnormal termination",
});

/** One of the values of {@link StepHook}. */
export type StepHook = ValueOf<typeof StepHook>;

/**
 * The hooks of a workflow policy, called once the journey's outcome is known.
 * Each value is written as the specification names it, such as
 * `"on workflow success"`.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export const WorkflowHook = closedSet({
  /** Called once the journey succeeded. */
  OnWorkflowSuccess: "on workflow success",
  /** Called once the journey failed. */
  OnWorkflowFailure: "on workflow failure",
});

/** One of the values of {@link WorkflowHook}. */
export type WorkflowHook = ValueOf<typeof WorkflowHook>;

/**
 * Why a step will be attempted again: its attempt reported a failure, or
 * ended in an abnormal termination that the step retries.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export const RetryCause = closedSet({
  /** The attempt reported a failure. */
  Failure: "failure",
  /** The attempt ended in an abnormal termination. */
  AbnormalTermination: "abnormal termination",
});

/** One of the values of {@link RetryCause}. */
export type RetryCause = ValueOf<typeof RetryCause>;

/**
 * A lifecycle a step hook returned, which decides what happens next, as the
 * `hook_called` event records it. A hook that keeps the default returns no
 * lifecycle.
 *
 * {@includeCode ../examples/lifecycle.ts}
 */
export type Lifecycle = FinishWorkflow | FailWorkflow;

/**
 * The journey succeeds at once.
 *
 * {@includeCode ../examples/lifecycle.ts}
 */
export interface FinishWorkflow {
  /** Which lifecycle this is. */
  readonly kind: "FinishWorkflow";
}

/**
 * The journey fails at once, with a reason.
 *
 * {@includeCode ../examples/lifecycle.ts}
 */
export interface FailWorkflow {
  /** Which lifecycle this is. */
  readonly kind: "FailWorkflow";
  /** Why the journey fails. */
  readonly reason: Reason;
}
