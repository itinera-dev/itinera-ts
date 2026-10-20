import type { Outcome, Reason } from "../step.js";
import { failure, skipped, success } from "../step/outcome.js";

/**
 * How a test says an attempt of a step ends, giving the outcome it stands
 * for, so that a step a test writes ends exactly as a real step does: it
 * succeeds, fails for a reason, skips itself, with or without one, or it
 * terminates abnormally, as an error escaping its `run` does.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export type Ending =
  EndsInSuccess | EndsInFailure | EndsInSkip | EndsAbnormally;

/**
 * How a test says an attempt of a rescue step ends: as a step's, but never
 * with a skip, which a rescue step cannot report.
 *
 * {@includeCode ../../examples/rescue-step-mock.ts}
 */
export type RescueEnding = EndsInSuccess | EndsInFailure | EndsAbnormally;

/**
 * The attempt succeeds.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export interface EndsInSuccess {
  /** Tells this ending from the others. */
  readonly kind: "success";
}

/**
 * The attempt fails, for the reason.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export interface EndsInFailure {
  /** Tells this ending from the others. */
  readonly kind: "failure";
  /** Why the attempt fails. */
  readonly reason: Reason;
}

/**
 * The step skips itself, saying why when the ending has a reason.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export interface EndsInSkip {
  /** Tells this ending from the others. */
  readonly kind: "skipped";
  /** Why the step skips itself, when it says. */
  readonly reason?: Reason;
}

/**
 * The attempt terminates abnormally, with an error carrying the message.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export interface EndsAbnormally {
  /** Tells this ending from the others. */
  readonly kind: "abnormal termination";
  /** The message of the error that ends the attempt. */
  readonly errorMessage: string;
}

/**
 * Makes each {@link Ending}, and gives the outcome it stands for.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export interface Endings {
  /** The attempt succeeds. */
  readonly success: EndsInSuccess;
  /** The attempt fails, for a reason, or only its code. */
  readonly failure: (reason: Reason | string) => EndsInFailure;
  /** The step skips itself, giving no reason. */
  readonly skip: EndsInSkip;
  /** The step skips itself, for a reason, or only its code. */
  readonly skipBecause: (reason: Reason | string) => EndsInSkip;
  /** The attempt terminates abnormally, with an error carrying the message. */
  readonly abnormalTermination: (errorMessage: string) => EndsAbnormally;
  /**
   * The outcome a step's `run` returns to end this way, its reason's
   * details captured now, as a step's helpers capture them.
   *
   * @throws Error carrying the message, for an abnormal termination, as a
   * step's `run` throws it.
   */
  readonly outcome: (ending: Ending) => Outcome;
}

/**
 * Makes each {@link Ending}, and gives the outcome it stands for.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export const Ending: Endings = Object.freeze({
  success: Object.freeze({ kind: "success" }),
  failure: endsInFailure,
  skip: Object.freeze({ kind: "skipped" }),
  skipBecause,
  abnormalTermination,
  outcome,
});

function endsInFailure(reason: Reason | string): EndsInFailure {
  return Object.freeze({ kind: "failure", reason: reasonOf(reason) });
}

function skipBecause(reason: Reason | string): EndsInSkip {
  return Object.freeze({ kind: "skipped", reason: reasonOf(reason) });
}

function abnormalTermination(errorMessage: string): EndsAbnormally {
  return Object.freeze({ kind: "abnormal termination", errorMessage });
}

/** The reason, or one with only the code, when given only its code. */
export function reasonOf(reason: Reason | string): Reason {
  return typeof reason === "string" ? { code: reason } : reason;
}

function outcome(ending: Ending): Outcome {
  switch (ending.kind) {
    case "success":
      return success;
    case "failure":
      return failure(ending.reason);
    case "skipped":
      return skipped(ending.reason);
    case "abnormal termination":
      throw new Error(ending.errorMessage);
  }
}
