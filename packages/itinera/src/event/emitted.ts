import type { PlainValue } from "../value.js";
import type { FixedFields, StepFields } from "./fields.js";
import type { EmitterSource } from "./source.js";

/**
 * The kinds of the events steps and hooks emit about their own work.
 *
 * {@includeCode ../../examples/event-kind.ts}
 */
export type EmittedKind =
  | "step_info"
  | "step_warning"
  | "step_error"
  | "journey_info"
  | "journey_warning"
  | "journey_error";

/**
 * An event a step emits about its own work, during one of its attempts.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface EmittedByStep<K extends EmittedKind> extends StepFields<K> {
  /** The step's message. */
  readonly message: string;
  /** The step's data, captured as a value when it was emitted. */
  readonly data?: PlainValue;
}

/**
 * An event a hook or a service provider emits about its own work.
 *
 * {@includeCode ../../examples/event.ts}
 */
export interface EmittedByHook<K extends EmittedKind> extends FixedFields<K> {
  /** The hook or service provider that emitted it. */
  readonly source: EmitterSource;
  /** The author's message. */
  readonly message: string;
  /** The author's data, captured as a value when it was emitted. */
  readonly data?: PlainValue;
}

/**
 * A step reported information.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type StepInfo = EmittedByStep<"step_info">;

/**
 * A step reported a warning.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type StepWarning = EmittedByStep<"step_warning">;

/**
 * A step reported an error, which does not change its outcome.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type StepError = EmittedByStep<"step_error">;

/**
 * A hook or a service provider reported information.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type JourneyInfo = EmittedByHook<"journey_info">;

/**
 * A hook or a service provider reported a warning.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type JourneyWarning = EmittedByHook<"journey_warning">;

/**
 * A hook or a service provider reported an error, which does not change what
 * it returns.
 *
 * {@includeCode ../../examples/event.ts}
 */
export type JourneyError = EmittedByHook<"journey_error">;
