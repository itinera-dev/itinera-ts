import type { Event, JourneyAbort } from "../event.js";
import { EventKind } from "../event/kind.js";
import { AbortReason, type Abort } from "../journey.js";
import type { Dispatcher } from "../report.js";
import type { StepName } from "../step.js";
import type { PlainValue } from "../value.js";
import type { Emitter, EventBody } from "./emitter.js";
import type { Failures } from "./guard.js";
import { messageOf } from "./message.js";
import { JourneyAbortError } from "./signal.js";

/**
 * One journey while it runs: it holds its data bag, makes its events and
 * delivers them through its dispatcher, knows the step being run, and
 * records the journey's abort, the first one standing.
 */
export class Journey {
  /** The step being run, if any. */
  step: StepName | undefined;
  #recorded: Abort | undefined;

  constructor(
    private readonly emitter: Emitter,
    private readonly dispatcher: Dispatcher,
    private readonly failures: Failures,
    /** The data bag: values by key, in the order each was first set. */
    readonly data: Map<string, PlainValue>,
  ) {}

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
  async emit(body: EventBody): Promise<void> {
    const event = this.emitter.next(body);
    const failedBefore = this.failures.first;
    try {
      await this.dispatcher.dispatch(event);
    } catch (thrown) {
      throw this.#reporterFailed(this.failures.first ?? { error: thrown });
    }
    const failed = this.failures.first;
    if (failed !== undefined && failed !== failedBefore) {
      throw this.#reporterFailed(failed);
    }
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
