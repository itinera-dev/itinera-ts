/**
 * Steps: what a step is called, its attempts, and the reasons it gives.
 *
 * @module
 */
import type { PlainValue } from "./value.js";

declare const stepName: unique symbol;

/**
 * The name of a step: a string that is never empty, checked when the
 * workflow is declared, so a plain string is not mistaken for one.
 *
 * {@includeCode ../examples/names.ts}
 */
export type StepName = string & {
  /** Marks the string as a step name made by itinera. */
  readonly [stepName]: true;
};

let following: (attempt: Attempt) => Attempt;

/**
 * One attempt of a step, counted from 1: the first execution of a step is
 * its first attempt, and each retry is the next. Only itinera makes one.
 *
 * It writes itself as its number, in a template string and in JSON.
 *
 * {@includeCode ../examples/attempt.ts}
 */
export class Attempt {
  /** The first attempt of a step. */
  static readonly first = new Attempt(1);

  static {
    following = (attempt) => new Attempt(attempt.number + 1);
  }

  private constructor(
    /** The attempt's number, from 1. */
    readonly number: number,
  ) {
    Object.freeze(this);
  }

  /** Whether this is the first attempt of its step. */
  isFirst(): boolean {
    return this.number === 1;
  }

  /** The attempt's number, as text. */
  toString(): string {
    return String(this.number);
  }

  /** The attempt's number, which is how `JSON.stringify` writes it. */
  toJSON(): number {
    return this.number;
  }
}

/** The attempt that follows the one given. */
export function nextAttempt(attempt: Attempt): Attempt {
  return following(attempt);
}

/**
 * Why a step failed or was skipped, or why a hook failed the journey: a code,
 * and optionally a message and details, as events and the result carry it.
 *
 * The details are a value, captured when the reason was given, so changing
 * what was given afterwards changes nothing here.
 *
 * {@includeCode ../examples/reason.ts}
 */
export interface Reason {
  /** A short code a program can compare, such as `"declined"`. */
  readonly code: string;
  /** A message for people. */
  readonly message?: string;
  /** Anything else the reason says, as a value. */
  readonly details?: PlainValue;
}
