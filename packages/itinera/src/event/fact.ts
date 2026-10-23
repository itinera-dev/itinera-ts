import type { Lifecycle } from "../policy.js";
import type { Reason } from "../step.js";
import type { JourneyAbort } from "./abort.js";
import type { FixedFields, StepFields } from "./fields.js";
import type { ByWorkflowHook, StepHookSource } from "./source.js";

/**
 * The journey started.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface JourneyStarted extends FixedFields<"journey_started"> {
  /** The keys of the initial data, never their values. */
  readonly initialKeys: readonly string[];
}

/**
 * An attempt of a step started.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type AttemptStarted = StepFields<"attempt_started">;

/**
 * An attempt reported Success.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type StepSucceeded = StepFields<"step_succeeded">;

/**
 * An attempt reported Failure.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface StepFailed extends StepFields<"step_failed"> {
  /** Why the step failed. */
  readonly reason: Reason;
}

/**
 * An attempt reported Skipped.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface StepSkipped extends StepFields<"step_skipped"> {
  /** Why the step was skipped, when it said. */
  readonly reason?: Reason;
}

/**
 * An error escaped a running step.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface StepAbnormalTermination extends StepFields<"step_abnormal_termination"> {
  /** The error's message. */
  readonly errorMessage: string;
}

/**
 * A hook returned without failing: a hook of a step policy, with the
 * lifecycle it returned, or a hook of a workflow policy, which returns none.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type HookCalled = StepHookCalled | WorkflowHookCalled;

/**
 * A hook of a step policy returned without failing.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface StepHookCalled extends FixedFields<"hook_called"> {
  /** The hook, with the step and attempt that triggered it. */
  readonly source: StepHookSource;
  /** The lifecycle it returned; none when it kept the default. */
  readonly lifecycle?: Lifecycle;
}

/**
 * A hook of a workflow policy returned without failing.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface WorkflowHookCalled extends FixedFields<"hook_called"> {
  /** The hook. */
  readonly source: ByWorkflowHook;
}

/**
 * The journey was aborted. This is always its last event.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface JourneyAborted extends FixedFields<"journey_aborted"> {
  /** Why it was aborted, and what that reason carries. */
  readonly abort: JourneyAbort;
}
