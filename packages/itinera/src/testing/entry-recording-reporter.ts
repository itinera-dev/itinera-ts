import type { Event, EventKind } from "../event.js";
import { None, type Option, Some } from "../option.js";
import type { PlainValue } from "../value.js";
import { RecordingReporter } from "./recording-reporter.js";

/**
 * A recording reporter that also keeps every entry of global metadata it
 * receives, in order, each with the kind of the event it received last
 * before it, so that a test can check when an entry was set, and every value
 * a key was given, not only the latest. Like {@link RecordingReporter}, it
 * never fails.
 *
 * {@includeCode ../../examples/entry-recording-reporter.ts}
 */
export class EntryRecordingReporter extends RecordingReporter {
  readonly #entries: GlobalMetadataEntry[] = [];
  #after: Option<EventKind> = None;

  /** Every entry of global metadata it has received so far, in order. */
  get entries(): readonly GlobalMetadataEntry[] {
    return [...this.#entries];
  }

  /** Keeps the event, as the kind of event the next entry follows. */
  override report(event: Event): void {
    this.#after = Some(event.kind);
    super.report(event);
  }

  /** Keeps the entry, after every entry received before it. */
  override receiveGlobalMetadata(key: string, value: PlainValue): void {
    this.#entries.push({ key, value, after: this.#after });
    super.receiveGlobalMetadata(key, value);
  }
}

/**
 * An entry of global metadata a reporter received, and when.
 *
 * {@includeCode ../../examples/entry-recording-reporter.ts}
 */
export interface GlobalMetadataEntry {
  /** The entry's key. */
  readonly key: string;
  /** The value it was given. */
  readonly value: PlainValue;
  /**
   * The kind of the event the reporter received last before the entry, or
   * `None` when it came before every event, as the journey ID does.
   */
  readonly after: Option<EventKind>;
}
