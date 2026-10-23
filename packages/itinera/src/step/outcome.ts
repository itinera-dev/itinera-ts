import type { Reason } from "../step.js";
import type { AsValue, PlainValue } from "../value.js";
import { capture } from "../value/capture.js";

/**
 * What one attempt of a step reports when it ends normally: it succeeded,
 * failed or skipped itself. A step makes it with the helpers of its base
 * class, such as `this.succeed()`, and reports anything abnormal by throwing
 * instead.
 *
 * {@includeCode ../../examples/outcome.ts}
 */
export type Outcome = Success | Fail | Skip;

/**
 * The attempt did its work, so what it contributed is committed to the data
 * bag.
 *
 * {@includeCode ../../examples/outcome.ts}
 */
export interface Success {
  /** Tells this outcome from the others. */
  readonly kind: "success";
}

/**
 * The attempt could not do its work, for a reason. Whether the step is
 * attempted again is for its retry budget and its hooks to decide, never for
 * the step.
 *
 * {@includeCode ../../examples/outcome.ts}
 */
export interface Fail {
  /** Tells this outcome from the others. */
  readonly kind: "failure";
  /** Why the attempt failed. */
  readonly reason: Reason;
}

/**
 * The step decided, from what it knows of its domain, not to do its work,
 * optionally saying why. A skipped step does not run again in the journey,
 * and what it contributed is discarded.
 *
 * {@includeCode ../../examples/outcome.ts}
 */
export interface Skip {
  /** Tells this outcome from the others. */
  readonly kind: "skipped";
  /** Why the step skipped itself, when it said. */
  readonly reason?: Reason;
}

/**
 * A reason as a step or a test gives it: its code alone, or a code with a
 * message and details. The details may be any value, an object that
 * serialises itself included, and are captured when the reason is given.
 *
 * {@includeCode ../../examples/outcome.ts}
 *
 * @typeParam T The type of the details.
 */
export type GivenReason<T = PlainValue> =
  | string
  | {
      /** A short code a program can compare, such as `"declined"`. */
      readonly code: string;
      /** A message for people. */
      readonly message?: string;
      /** Anything else the reason says, as a value. */
      readonly details?: T & AsValue<T>;
    };

const made = new WeakSet<object>();
const detailsRefused = new WeakSet<object>();

/** The one success, which every step that succeeds reports. */
export const success: Success = Object.freeze({ kind: "success" });
made.add(success);

/** The one skip that gives no reason. */
const skippedWithoutReason: Skip = Object.freeze({ kind: "skipped" });
made.add(skippedWithoutReason);

/** The failure for the reason `given`, its details captured now. */
export function failure<T>(given: GivenReason<T>): Fail {
  const { reason, refused } = reasonOf(given);
  return outcome({ kind: "failure", reason }, refused);
}

/** The skip for the reason `given`, if any, its details captured now. */
export function skipped<T>(given?: GivenReason<T>): Skip {
  if (given === undefined) {
    return skippedWithoutReason;
  }
  const { reason, refused } = reasonOf(given);
  return outcome({ kind: "skipped", reason }, refused);
}

/**
 * Whether `returned` is an outcome itinera made, as a step's helpers make
 * them, rather than anything else a cast lets a step return.
 */
export function isOutcome(returned: unknown): returned is Outcome {
  return (
    typeof returned === "object" && returned !== null && made.has(returned)
  );
}

/**
 * Whether the details given with the reason of `outcome` were not a value,
 * so that its reason holds none.
 */
export function hasDetailsRefused(outcome: Outcome): boolean {
  return detailsRefused.has(outcome);
}

function outcome<O extends Fail | Skip>(reported: O, refused: boolean): O {
  const frozen = Object.freeze(reported);
  made.add(frozen);
  if (refused) {
    detailsRefused.add(frozen);
  }
  return frozen;
}

/** The reason `given`, and whether its details were refused as not a value. */
export function reasonOf<T>(given: GivenReason<T>): {
  readonly reason: Reason;
  readonly refused: boolean;
} {
  if (typeof given === "string") {
    return { reason: Object.freeze({ code: given }), refused: false };
  }
  const { code, message } = given;
  const told = { code, ...(message === undefined ? {} : { message }) };
  if (given.details === undefined) {
    return { reason: Object.freeze(told), refused: false };
  }
  const details = capture(given.details);
  return details.isOk()
    ? {
        reason: Object.freeze({ ...told, details: details.value }),
        refused: false,
      }
    : { reason: Object.freeze(told), refused: true };
}
