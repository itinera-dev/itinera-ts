import type { Level } from "../event/level.js";
import type { Option } from "../option.js";
import type { PlainValue } from "../value.js";

export { Level } from "../event/level.js";

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
