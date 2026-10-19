import type { Event } from "../event.js";
import type { Reporter } from "../report.js";
import type { PlainValue } from "../value.js";
import { line } from "./recording-reporter/path.js";

/**
 * A reporter for tests: it keeps every event it receives, in order, and the
 * latest value of each entry of global metadata, for a test to read once the
 * journey is over. It never fails.
 *
 * A test adds one to a workflow instance, runs the journey, then reads its
 * `events`, its `globalMetadata` and its `path`.
 *
 * {@includeCode ../../examples/recording-reporter.ts}
 */
export class RecordingReporter implements Reporter {
  readonly #events: Event[] = [];
  readonly #globalMetadata = new Map<string, PlainValue>();

  /** Every event it has received so far, in the order it received them. */
  get events(): readonly Event[] {
    return [...this.#events];
  }

  /**
   * The global metadata it has received so far: each key with its latest
   * value, in the order the keys were first set. The journey ID is the first
   * entry, under `journey_id`.
   */
  get globalMetadata(): ReadonlyMap<string, PlainValue> {
    return new Map(this.#globalMetadata);
  }

  /**
   * The path of the journey so far: one line for each event of its flow, in
   * the order it received them, so that a test can compare it with the path
   * it expects, or with an approved file through `path.join("\n")`.
   *
   * Only the flow has lines: the outcome of each attempt, each decision on a
   * step, and how the journey ended. Inputs, services, hooks, contributions,
   * the events steps, hooks and service providers emit, and global metadata
   * have none, and no line holds a timestamp, a sequence number or an ID, so
   * a path changes only when the flow does. The lines read:
   *
   * - `charge attempt 1 succeeded`; `charge attempt 1 failed: declined`, with
   *   the reason's code; `charge attempt 1 skipped`, with `: ` and the
   *   reason's code when it has one; and `charge attempt 1 terminated
   *   abnormally: timeout`, with the error's message. A rescue step's
   *   attempts read the same under its own name, such as `charge_rescue`.
   * - `charge retrying`; `charge given up: retries exhausted`, or the other
   *   cause, `failure` or `abnormal termination`; and `charge given up:
   *   FailWorkflow from fraud_check` when a hook of the policy `fraud_check`
   *   gave it up.
   * - `charge rescuing with charge_rescue` and `charge rescued by
   *   charge_rescue`.
   * - `journey succeeded`, or `journey succeeded, decided by early_exit` when
   *   a hook of the policy `early_exit` decided it; `journey failed at charge:
   *   declined`, with the code of the reason the journey failed for, or the
   *   error's message when there is no reason; and `journey aborted at charge:
   *   step could not be built`, with the abort reason, or `journey aborted:
   *   reporter failed` when the abort concerns no step.
   *
   * A refused journey has no events, so its path is empty.
   */
  get path(): readonly string[] {
    return this.#events.map(line).filter(isLine);
  }

  /** Keeps the event. */
  report(event: Event): void {
    this.#events.push(event);
  }

  /** Keeps the entry, replacing the value an earlier one gave the key. */
  receiveGlobalMetadata(key: string, value: PlainValue): void {
    this.#globalMetadata.set(key, value);
  }
}

function isLine(text: string | undefined): text is string {
  return text !== undefined;
}
