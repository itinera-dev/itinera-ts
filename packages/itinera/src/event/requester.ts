import type {
  ByAdapter,
  ByProvider,
  ByRescueStep,
  ByStep,
  ByStepHook,
  ByWorkflowHook,
} from "./source.js";

/**
 * Who made a request whose data could not be resolved: a step for one of its
 * inputs, an input adapter resolving a step's input, a hook, or a service
 * provider supplying a step's service.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export type Requester =
  ByStep | ByAdapter | ByStepHook | ByWorkflowHook | ByProvider;

/**
 * Who requested what a failed attempt left, the failure's reason or the
 * error: a hook of a step policy, for the step it acts on, or a rescue step,
 * for the step it rescues.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export type FailureRequester = ByStepHook | ByRescueStep;

/**
 * What a required request found missing: data under a key, or the failure's
 * reason or the error of a failed attempt.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export type MissingData = MissingKey | MissingFailure;

/**
 * Data under a key.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface MissingKey {
  /** What is missing. */
  readonly kind: "key";
  /** The key that was requested. */
  readonly key: string;
  /** Who requested it. */
  readonly requester: Requester;
}

/**
 * The failure's reason, which the attempt did not report, or the error,
 * which did not end the attempt.
 *
 * {@includeCode ../../examples/journey-abort.ts}
 */
export interface MissingFailure {
  /** What is missing. */
  readonly kind: "failure reason" | "error";
  /** Who requested it. */
  readonly requester: FailureRequester;
}
