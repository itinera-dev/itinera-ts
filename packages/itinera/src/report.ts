/**
 * Reporters, which receive the events and the global metadata of a journey,
 * and dispatchers, which deliver them.
 *
 * @module
 */
import type { Event } from "./event.js";
import type { PlainValue } from "./value.js";

export { DebugReporter } from "./report/debug-reporter.js";
export {
  DefaultDispatcher,
  DefaultDispatcherFactory,
} from "./report/default-dispatcher.js";

/**
 * Receives the events and the global metadata of a journey, and decides on
 * its own what to do with each: filter it, map it, forward it, keep it or
 * ignore it. A workflow lists its reporters, and a workflow instance may add
 * more; itinera builds them for every journey.
 *
 * Either operation may be synchronous or asynchronous: itinera waits for
 * what it returns before it goes on, so a slow reporter slows the journey.
 *
 * A reporter handles its own trouble. One that cannot report an event should
 * deal with that itself, by logging it, dropping the event or keeping it to
 * retry later, and return normally, so that the reporters after it still
 * receive the event. A failure that escapes a reporter, a throw or a rejected
 * promise, aborts the journey with `reporter failed`, and the event goes no
 * further.
 *
 * {@includeCode ../examples/reporter.ts}
 */
export interface Reporter {
  /** Receives one event of the journey. */
  report(event: Event): void | Promise<void>;

  /**
   * Receives one entry of the journey's global metadata: a key, and a value
   * captured when it was set. The journey ID comes first, under
   * `journey_id`; setting a key again replaces its value. A reporter
   * without this operation accepts every entry and does nothing with it.
   */
  receiveGlobalMetadata?(key: string, value: PlainValue): void | Promise<void>;
}

/**
 * Delivers the events and the global metadata of one journey to the
 * reporters added to it.
 *
 * An executor gets a new dispatcher for every journey from its
 * {@link DispatcherFactory}, adds the journey's reporters to it, sets every
 * entry of the journey's global metadata and dispatches every event of the
 * journey through it, and drops it when the journey ends. What adding a
 * reporter means, and how events and global metadata are delivered, is the
 * dispatcher's own decision; {@link DefaultDispatcher} is the usual one.
 * Whatever the dispatcher does, the executor keeps a reporter that failed
 * from receiving anything more, and every other reporter from receiving
 * anything but `journey_aborted`.
 *
 * Each operation may be synchronous or asynchronous. Failing in `add`, or in
 * `setGlobalMetadata` before the journey starts, refuses the journey;
 * failing in `dispatch`, or in `setGlobalMetadata` while the journey runs,
 * aborts it with `reporter failed`, except while `journey_aborted` is
 * dispatched, when the failure is ignored.
 *
 * {@includeCode ../examples/dispatcher.ts}
 */
export interface Dispatcher {
  /** Adds a reporter for the journey. */
  add(reporter: Reporter): void | Promise<void>;

  /** Delivers one event. */
  dispatch(event: Event): void | Promise<void>;

  /** Passes one entry of the journey's global metadata on. */
  setGlobalMetadata(key: string, value: PlainValue): void | Promise<void>;
}

/**
 * Creates a new {@link Dispatcher} for every journey, before it starts.
 * Failing, by throwing or by rejecting, refuses the journey.
 *
 * {@includeCode ../examples/dispatcher-factory.ts}
 */
export interface DispatcherFactory {
  /** Creates the dispatcher for one journey. */
  create(): Dispatcher | Promise<Dispatcher>;
}
