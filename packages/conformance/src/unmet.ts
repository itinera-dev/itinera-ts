import type { Event } from "itinera/unstable";
import { kindOf } from "./trace.js";

/**
 * What a Then sentence expected and itinera did not do: a failure of the
 * implementation, never an error in the case.
 */
export class Unmet extends Error {
  override readonly name = "Unmet";
}

/**
 * Holds when the condition does, and otherwise says what was expected and
 * which events the stream held.
 *
 * @throws Unmet when the condition does not hold.
 */
export function expectOfStream(
  condition: boolean,
  expected: string,
  events: readonly Event[],
): void {
  holds(
    condition,
    expected,
    `the events ${JSON.stringify(events.map(kindOf))}`,
  );
}

/**
 * Holds when the condition does, and otherwise says what was expected and
 * what was found.
 *
 * @throws Unmet when the condition does not hold.
 */
export function holds(
  condition: boolean,
  expected: string,
  found: string,
): void {
  if (!condition) {
    throw new Unmet(`expected ${expected}; found ${found}`);
  }
}
