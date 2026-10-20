import type { Reason } from "../step.js";
import { reasonOf } from "./ending.js";

/**
 * How a test says a call of a hook of a policy mock ends: it keeps the
 * default, which for a workflow hook means it returns nothing, it finishes
 * or fails the workflow, or it fails, throwing an error, as a hook that
 * fails does.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export type HookEnding = FailureHookEnding | FinishesWorkflow;

/**
 * How a call of a hook that cannot finish the workflow ends: any hook but
 * `on step success`.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export type FailureHookEnding = KeepsDefault | FailsWorkflow | HookFails;

/**
 * How a call of a workflow hook ends: it returns nothing, or it fails.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export type WorkflowHookEnding = KeepsDefault | HookFails;

/**
 * The hook keeps the default: a step hook returns `keepDefault()`, and a
 * workflow hook returns nothing.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface KeepsDefault {
  /** Tells this ending from the others. */
  readonly kind: "keep default";
}

/**
 * `on step success` returns `finishWorkflow()`.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface FinishesWorkflow {
  /** Tells this ending from the others. */
  readonly kind: "finish workflow";
}

/**
 * A step hook returns `failWorkflow(reason)`.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface FailsWorkflow {
  /** Tells this ending from the others. */
  readonly kind: "fail workflow";
  /** The reason the journey fails for. */
  readonly reason: Reason;
}

/**
 * The hook fails, throwing an error carrying the message.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface HookFails {
  /** Tells this ending from the others. */
  readonly kind: "fail";
  /** The message of the error it throws. */
  readonly errorMessage: string;
}

/**
 * Makes each {@link HookEnding}.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export interface HookEndings {
  /** The hook keeps the default, or a workflow hook returns nothing. */
  readonly keepDefault: KeepsDefault;
  /** `on step success` finishes the workflow. */
  readonly finishWorkflow: FinishesWorkflow;
  /** A step hook fails the workflow, for a reason, or only its code. */
  readonly failWorkflow: (reason: Reason | string) => FailsWorkflow;
  /** The hook fails, throwing an error carrying the message. */
  readonly fail: (errorMessage: string) => HookFails;
}

/**
 * Makes each {@link HookEnding}.
 *
 * {@includeCode ../../examples/policy-mock.ts}
 */
export const HookEnding: HookEndings = Object.freeze({
  keepDefault: Object.freeze({ kind: "keep default" }),
  finishWorkflow: Object.freeze({ kind: "finish workflow" }),
  failWorkflow,
  fail,
});

function failWorkflow(reason: Reason | string): FailsWorkflow {
  return Object.freeze({
    kind: "fail workflow",
    reason: reasonOf(reason),
  });
}

function fail(errorMessage: string): HookFails {
  return Object.freeze({ kind: "fail", errorMessage });
}
