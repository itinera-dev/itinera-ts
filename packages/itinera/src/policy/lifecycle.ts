import type { Reason } from "../step.js";
import { type GivenReason, reasonOf } from "../step/outcome.js";

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

const detailsRefused = new WeakSet<object>();

/** What every hook that keeps the default returns. */
export const keptDefault: KeepDefault = Object.freeze({ kind: "KeepDefault" });

/** What every hook that finishes the workflow returns. */
export const finished: FinishWorkflow = Object.freeze({
  kind: "FinishWorkflow",
});

/**
 * The lifecycle that fails the journey for the reason `given`, its details
 * captured now.
 */
export function failingWorkflow<T>(given: GivenReason<T>): FailWorkflow {
  const { reason, refused } = reasonOf(given);
  const failing: FailWorkflow = Object.freeze({ kind: "FailWorkflow", reason });
  if (refused) {
    detailsRefused.add(failing);
  }
  return failing;
}

/**
 * Whether `returned` is a lifecycle failing the workflow whose details were
 * not a value, so that its reason holds none.
 */
export function hasDetailsRefused(returned: object): boolean {
  return detailsRefused.has(returned);
}
