import { closedSet, type ValueOf } from "../closed-set.js";
import type { Option } from "../option.js";
import type { PlainValue } from "../value.js";

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

/** One of the values of {@link Level}. */
export type Level = ValueOf<typeof Level>;

/**
 * An event a step or a hook emitted through the reporter a recorder lent it:
 * its level, its message and its data, captured as it was emitted.
 *
 * {@includeCode ../../examples/event-reporter-recorders.ts}
 */
export interface Emitted {
  /** The level it was emitted at. */
  readonly level: Level;
  /** Its message. */
  readonly message: string;
  /** Its data, or `None` when it was emitted with none. */
  readonly data: Option<PlainValue>;
}
