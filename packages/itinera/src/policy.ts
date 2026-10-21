/**
 * Policies: step policies and workflow policies, what a policy is called,
 * its hooks, what they request, the lifecycles a step hook returns, and the
 * roles a policy requests of its workflow.
 *
 * {@includeCode ../examples/policy.ts}
 *
 * @module itinera/policy
 */
import { closedSet, type ValueOf } from "./closed-set.js";
import type { FailureCause } from "./journey.js";

export {
  type PolicyOptions,
  stepPolicy,
  workflowPolicy,
} from "./policy/declared.js";
export {
  type HookDecorator,
  onStepAbnormalTermination,
  onStepFailure,
  onStepRetry,
  onStepSuccess,
  onWorkflowFailure,
  onWorkflowSuccess,
} from "./policy/hooks.js";

export type {
  FailWorkflow,
  FinishWorkflow,
  KeepDefault,
  Lifecycle,
  OnFailure,
  OnSuccess,
} from "./policy/lifecycle.js";
export { type HookReporter, hookReporter } from "./policy/reporter.js";
export { failureCause, fromStep, retryCause, role } from "./policy/request.js";
export type { PolicyDescriptor } from "./policy/descriptor.js";
export type { Provides, RolesOf, RolesOfOne } from "./policy/roles.js";
export { StepPolicy, type StepPolicyClass } from "./policy/step-policy.js";
export type { StepPolicyBuilder } from "./policy/step-policy/builder.js";
export {
  WorkflowPolicy,
  type WorkflowPolicyClass,
} from "./policy/workflow-policy.js";
export type { WorkflowPolicyBuilder } from "./policy/workflow-policy/builder.js";

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

/**
 * One of the values of {@link StepHook}.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
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

/**
 * One of the values of {@link WorkflowHook}.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
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

/**
 * One of the values of {@link RetryCause}.
 *
 * {@includeCode ../examples/closed-set.ts}
 */
export type RetryCause = ValueOf<typeof RetryCause>;

/**
 * Why a step was given up, as `on step failure` is told: its last attempt
 * reported a failure, ended in an abnormal termination, or spent its retry
 * budget.
 *
 * {@includeCode ../examples/policy.ts}
 */
export type StepFailureCause = Exclude<FailureCause, "FailWorkflow">;
