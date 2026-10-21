import { closedSet, type ValueOf } from "../closed-set.js";

/**
 * The level of an event a step or a hook emits through its reporter: `info`,
 * `warning` or `error`.
 *
 * {@includeCode ../../examples/event-reporter-recorders.ts}
 */
export const Level = closedSet({
  /** Emitted with `info`. */
  Info: "info",
  /** Emitted with `warning`. */
  Warning: "warning",
  /** Emitted with `error`. */
  Error: "error",
});

/**
 * One of the values of {@link Level}.
 *
 * {@includeCode ../../examples/event-reporter-recorders.ts}
 */
export type Level = ValueOf<typeof Level>;
