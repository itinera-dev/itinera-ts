import type { Event } from "../event.js";
import { EventKind } from "../event/kind.js";
import type { Dispatcher, DispatcherFactory, Reporter } from "../report.js";
import type { PlainValue } from "../value.js";

/**
 * The dispatcher executors use unless they are given another factory.
 *
 * It calls its reporters in the order they were added, waiting for each
 * before the next. When a reporter fails, the event stops there and the
 * failure is passed on, except for `journey_aborted`, which goes on to every
 * reporter past a failure, then passes on the first. Each entry of global
 * metadata reaches the reporters in the same order, and stops at the first
 * that fails.
 *
 * {@includeCode ../../examples/default-dispatcher.ts}
 */
export class DefaultDispatcher implements Dispatcher {
  readonly #reporters: Reporter[] = [];

  /** Adds a reporter after those already added. */
  add(reporter: Reporter): void {
    this.#reporters.push(reporter);
  }

  /** Delivers one event to every reporter, in the order they were added. */
  async dispatch(event: Event): Promise<void> {
    await (event.kind === EventKind.JourneyAborted
      ? toEveryone(this.#reporters, event)
      : untilOneFails(this.#reporters, event));
  }

  /** Passes one entry of global metadata to every reporter, in order. */
  async setGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    for (const reporter of this.#reporters) {
      await reporter.receiveGlobalMetadata?.(key, value);
    }
  }
}

/**
 * The factory of {@link DefaultDispatcher}, which executors use unless they
 * are given another.
 *
 * {@includeCode ../../examples/default-dispatcher.ts}
 */
export class DefaultDispatcherFactory implements DispatcherFactory {
  /** Creates a dispatcher holding no reporter. */
  create(): DefaultDispatcher {
    return new DefaultDispatcher();
  }
}

async function untilOneFails(
  reporters: readonly Reporter[],
  event: Event,
): Promise<void> {
  for (const reporter of reporters) {
    await reporter.report(event);
  }
}

async function toEveryone(
  reporters: readonly Reporter[],
  event: Event,
): Promise<void> {
  let first: { readonly failure: unknown } | undefined;
  for (const reporter of reporters) {
    try {
      await reporter.report(event);
    } catch (failure) {
      first ??= { failure };
    }
  }
  if (first !== undefined) {
    throw first.failure;
  }
}
