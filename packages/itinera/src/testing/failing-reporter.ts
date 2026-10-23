import type { Event, EventKind } from "../event.js";
import type { PlainValue } from "../value.js";
import { EntryRecordingReporter } from "./entry-recording-reporter.js";

/**
 * Where a {@link FailingReporter} fails: on the first event it receives, on
 * every event of a kind, or on every entry of global metadata under a key,
 * each with the message of the error it throws, or one of its own.
 *
 * {@includeCode ../../examples/failing-reporter.ts}
 */
export type ReporterFailure =
  | {
      /** It fails on the first event it receives. */
      readonly kind: "first event";
      /** The message of the error it throws. */
      readonly message?: string;
    }
  | {
      /** It fails on every event of a kind. */
      readonly kind: "on event";
      /** The kind of event it fails on. */
      readonly event: EventKind;
      /** The message of the error it throws. */
      readonly message?: string;
    }
  | {
      /** It fails on every entry of global metadata under a key. */
      readonly kind: "on global metadata";
      /** The key of the entries it fails on. */
      readonly key: string;
      /** The message of the error it throws. */
      readonly message?: string;
    };

/**
 * A reporter that fails as a test says, to check what a journey does when a
 * reporter fails. It keeps what an {@link EntryRecordingReporter} keeps,
 * the event or entry it fails on included, then throws an `Error` wherever
 * one of its failures says, and remembers whether it ever did. Given no
 * failure, it never fails.
 *
 * {@includeCode ../../examples/failing-reporter.ts}
 */
export class FailingReporter extends EntryRecordingReporter {
  readonly #failures: readonly ReporterFailure[];
  #failed = false;

  /** Makes a reporter that fails wherever one of `failures` says. */
  constructor(...failures: readonly ReporterFailure[]) {
    super();
    this.#failures = failures;
  }

  /** Whether it failed on any event or entry of global metadata. */
  get failed(): boolean {
    return this.#failed;
  }

  /**
   * Keeps the event, then fails if one of its failures says so.
   *
   * @throws Error when one of its failures is on this event.
   */
  override report(event: Event): void {
    const isFirst = this.events.length === 0;
    super.report(event);
    const failure = this.#failures.find(onEvent(event, isFirst));
    if (failure !== undefined) {
      this.#failed = true;
      throw new Error(failure.message ?? `the reporter fails on ${event.kind}`);
    }
  }

  /**
   * Keeps the entry, then fails if one of its failures says so.
   *
   * @throws Error when one of its failures is on this entry's key.
   */
  override receiveGlobalMetadata(key: string, value: PlainValue): void {
    super.receiveGlobalMetadata(key, value);
    const failure = this.#failures.find(onKey(key));
    if (failure !== undefined) {
      this.#failed = true;
      throw new Error(
        failure.message ?? `the reporter fails on the global metadata ${key}`,
      );
    }
  }
}

function onEvent(
  event: Event,
  isFirst: boolean,
): (failure: ReporterFailure) => boolean {
  return (failure) => failsOn(failure, event, isFirst);
}

function failsOn(
  failure: ReporterFailure,
  event: Event,
  isFirst: boolean,
): boolean {
  switch (failure.kind) {
    case "first event":
      return isFirst;
    case "on event":
      return failure.event === event.kind;
    case "on global metadata":
      return false;
  }
}

function onKey(key: string): (failure: ReporterFailure) => boolean {
  return (failure) => isOnKey(failure, key);
}

function isOnKey(failure: ReporterFailure, key: string): boolean {
  return failure.kind === "on global metadata" && failure.key === key;
}
