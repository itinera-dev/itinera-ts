let following: (attempt: Attempt) => Attempt;

/**
 * One attempt of a step, counted from 1: the first execution of a step is
 * its first attempt, and each retry is the next. Only itinera makes one.
 *
 * It writes itself as its number, in a template string and in JSON.
 *
 * {@includeCode ../../examples/attempt.ts}
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
