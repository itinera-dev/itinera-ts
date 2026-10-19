import type { Reason } from "../step.js";

/**
 * A lifecycle a step hook returned, which decides what happens next, as the
 * `hook_called` event records it. A hook that keeps the default returns no
 * lifecycle.
 *
 * {@includeCode ../../examples/lifecycle.ts}
 */
export type Lifecycle = FinishWorkflow | FailWorkflow;

/**
 * The journey succeeds at once.
 *
 * {@includeCode ../../examples/lifecycle.ts}
 */
export interface FinishWorkflow {
  /** Which lifecycle this is. */
  readonly kind: "FinishWorkflow";
}

/**
 * The journey fails at once, with a reason.
 *
 * {@includeCode ../../examples/lifecycle.ts}
 */
export interface FailWorkflow {
  /** Which lifecycle this is. */
  readonly kind: "FailWorkflow";
  /** Why the journey fails. */
  readonly reason: Reason;
}

/**
 * What a step hook returns to keep the default: the journey goes on as if no
 * hook were defined. It is not a lifecycle, so `hook_called` records none.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export interface KeepDefault {
  /** Tells this from a lifecycle. */
  readonly kind: "KeepDefault";
}

/**
 * What `on step success` returns: the default, the journey succeeding at
 * once, or the journey failing at once.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type OnSuccess = KeepDefault | FinishWorkflow | FailWorkflow;

/**
 * What `on step failure`, `on step retry` and `on step abnormal termination`
 * return: the default, or the journey failing at once. A failure hook cannot
 * finish the workflow, so returning `FinishWorkflow` does not compile.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type OnFailure = KeepDefault | FailWorkflow;
