import type { Outcome } from "../step.js";
import { success } from "../step/outcome.js";

/**
 * How a test says an attempt of a step ends, giving the outcome it stands
 * for, so that a step a test writes ends exactly as a real step does: it
 * succeeds, or it terminates abnormally, as an error escaping its `run` does.
 *
 * {@includeCode ../../examples/ending.ts}
 */
export type Ending = EndsInSuccess | EndsAbnormally;

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
  /** The attempt terminates abnormally, with an error carrying the message. */
  readonly abnormalTermination: (errorMessage: string) => EndsAbnormally;
  /**
   * The outcome a step's `run` returns to end this way.
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
  abnormalTermination,
  outcome,
});

function abnormalTermination(errorMessage: string): EndsAbnormally {
  return Object.freeze({ kind: "abnormal termination", errorMessage });
}

function outcome(ending: Ending): Outcome {
  switch (ending.kind) {
    case "success":
      return success;
    case "abnormal termination":
      throw new Error(ending.errorMessage);
  }
}
