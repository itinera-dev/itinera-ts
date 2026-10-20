import type { Event, JourneyAbort } from "../event.js";
import { EventKind } from "../event/kind.js";
import { AbortReason, type Abort } from "../journey.js";
import type { Dispatcher } from "../report.js";
import type { ProviderName } from "../service.js";
import type { StepName } from "../step.js";
import type { PlainValue } from "../value.js";
import type { Emitter, EventBody } from "./emitter.js";
import type { Failures } from "./guard.js";
import { messageOf } from "./message.js";
import type { Scripting } from "./script.js";
import { JourneyAbortError } from "./signal.js";

/**
 * One journey while it runs: it holds its data bag and the instances of
 * journey scope its service providers made, makes its events and delivers
 * them through its dispatcher, knows the step being run, and records the
 * journey's abort, the first one standing. A scripted run gives it its
 * script.
 */
export class Journey {
  /** The step being run, if any. */
  step: StepName | undefined;
  /**
   * The instance each service provider of journey scope made, by its name,
   * lent to every attempt it serves until the journey ends.
   */
  readonly kept = new Map<ProviderName, unknown>();
  #recorded: Abort | undefined;

  constructor(
    private readonly emitter: Emitter,
    private readonly dispatcher: Dispatcher,
    private readonly failures: Failures,
    /** The data bag: values by key, in the order each was first set. */
    readonly data: Map<string, PlainValue>,
    /** The script of a scripted run, which the engine consults. */
    readonly script?: Scripting,
  ) {}

  /** Lets go of every instance of journey scope it kept, once it has ended. */
  end(): void {
    this.kept.clear();
  }

  /** The abort recorded, once the journey was aborted. */
  get recorded(): Abort | undefined {
    return this.#recorded;
  }

  /**
   * Makes and delivers one event. When a reporter or the dispatcher fails on
   * it, or a dispatcher swallows the failure of a reporter, the journey is
   * aborted with `reporter failed`.
   *
   * @throws JourneyAbortError once the journey is aborted.
   */
  emit(body: EventBody): Promise<void> {
    const event = this.emitter.next(body);
    return this.#delivering(() => this.dispatcher.dispatch(event));
  }

  /**
   * Sets an entry of global metadata on the dispatcher, for its reporters,
   * with the same rules as {@link Journey.emit} when a reporter or the
   * dispatcher fails on it.
   *
   * @throws JourneyAbortError once the journey is aborted.
   */
  setGlobalMetadata(key: string, value: PlainValue): Promise<void> {
    return this.#delivering(() =>
      this.dispatcher.setGlobalMetadata(key, value),
    );
  }

  /**
   * Commits `value` under `key` to the data bag, and says whether it
   * replaced a value.
   */
  commit(key: string, value: PlainValue): boolean {
    const replaced = this.data.has(key);
    this.data.set(key, value);
    return replaced;
  }

  /**
   * Records the abort, unless one is recorded already, since the first
   * stands, and gives the signal that carries the abort recorded.
   */
  abort(abort: Abort): JourneyAbortError {
    this.#recorded ??= abort;
    return new JourneyAbortError(this.#recorded);
  }

  /**
   * Delivers `journey_aborted` for the abort recorded, ignoring whatever
   * fails while it is delivered.
   */
  async deliverAborted(abort: Abort): Promise<void> {
    const event: Event = this.emitter.next({
      kind: EventKind.JourneyAborted,
      abort: reported(abort),
    });
    try {
      await this.dispatcher.dispatch(event);
    } catch {
      // The first abort reason stands, and no further event is emitted.
    }
  }

  async #delivering(delivery: () => void | Promise<void>): Promise<void> {
    const failedBefore = this.failures.first;
    try {
      await delivery();
    } catch (thrown) {
      throw this.#reporterFailed(this.failures.first ?? { error: thrown });
    }
    const failed = this.failures.first;
    if (failed !== undefined && failed !== failedBefore) {
      throw this.#reporterFailed(failed);
    }
  }

  #reporterFailed({ error }: { readonly error: unknown }): JourneyAbortError {
    return this.abort({
      reason: AbortReason.ReporterFailed,
      ...(this.step === undefined ? {} : { step: this.step }),
      errorMessage: messageOf(error),
      error,
    });
  }
}

/** The abort as `journey_aborted` carries it: without the error itself. */
function reported(abort: Abort): JourneyAbort {
  if (!("error" in abort)) {
    return abort;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- journey_aborted carries the error only as its message
  const { error, ...rest } = abort;
  return rest;
}
