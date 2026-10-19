import type { StepSource } from "../event.js";
import { EventKind } from "../event/kind.js";
import { AbortReason, type Abort, type Contributor } from "../journey.js";
import type { StepReporter } from "../step.js";
import type { PlainValue } from "../value.js";
import { capture } from "../value/capture.js";
import type { Journey } from "./journey.js";
import { JourneyAbortError } from "./signal.js";
import { journeyIdKey } from "./start.js";

/** The kinds of the events a step emits about its own work. */
type StepEmittedKind =
  | typeof EventKind.StepInfo
  | typeof EventKind.StepWarning
  | typeof EventKind.StepError;

/**
 * The handles itinera lends one attempt of a step: its contributor and its
 * step reporter. They keep what the attempt contributed, and run every call
 * that emits or sets global metadata in the order the step made it, each
 * once the one before has settled, so a call the step does not await keeps
 * its place. Once the attempt ends they are closed: a call then throws where
 * it is made, and changes nothing.
 */
export class AttemptHandles {
  /** What the attempt contributed, by key, in the order first contributed. */
  readonly contributed = new Map<string, PlainValue>();
  /** The contributor lent to the attempt. */
  readonly contributor: Contributor;
  /** The step reporter lent to the attempt. */
  readonly reporter: StepReporter;
  #closed = false;
  #last: Promise<void> = Promise.resolve();

  constructor(
    private readonly journey: Journey,
    private readonly source: StepSource,
  ) {
    this.contributor = Object.freeze({
      contribute: (key: string, value: unknown) => {
        this.#contribute(key, value);
      },
    });
    this.reporter = Object.freeze({
      info: (message: string, data?: unknown) =>
        this.#emit(EventKind.StepInfo, message, data),
      warning: (message: string, data?: unknown) =>
        this.#emit(EventKind.StepWarning, message, data),
      error: (message: string, data?: unknown) =>
        this.#emit(EventKind.StepError, message, data),
      setGlobalMetadata: (key: string, value: unknown) =>
        this.#setGlobalMetadata(key, value),
    });
  }

  /** Settles once every call the attempt made on its step reporter has settled. */
  settled(): Promise<void> {
    return this.#last;
  }

  /** Closes both handles, for good. */
  close(): void {
    this.#closed = true;
  }

  #contribute(key: string, value: unknown): void {
    this.#refuseOnceClosed("contributor");
    const captured = capture(value);
    if (captured.isErr()) {
      throw this.#aborting({
        reason: AbortReason.NotAValue,
        step: this.source.step,
        key,
      });
    }
    this.contributed.set(key, captured.value);
  }

  #emit(kind: StepEmittedKind, message: string, data: unknown): Promise<void> {
    this.#refuseOnceClosed("step reporter");
    const { step, attempt } = this.source;
    if (data === undefined) {
      return this.#inTurn(() =>
        this.journey.emit({ kind, step, attempt, message }),
      );
    }
    const captured = capture(data);
    if (captured.isErr()) {
      return this.#abortInTurn({
        reason: AbortReason.NotAValue,
        step,
        eventKind: kind,
      });
    }
    return this.#inTurn(() =>
      this.journey.emit({
        kind,
        step,
        attempt,
        message,
        data: captured.value,
      }),
    );
  }

  #setGlobalMetadata(key: string, value: unknown): Promise<void> {
    this.#refuseOnceClosed("step reporter");
    const { step } = this.source;
    if (key === journeyIdKey) {
      return this.#abortInTurn({
        reason: AbortReason.ReservedMetadataKey,
        step,
        key,
        source: { kind: "step" },
      });
    }
    const captured = capture(value);
    if (captured.isErr()) {
      return this.#abortInTurn({ reason: AbortReason.NotAValue, step, key });
    }
    return this.#inTurn(async () => {
      await this.journey.setGlobalMetadata(key, captured.value);
      await this.journey.emit({
        kind: EventKind.GlobalMetadataSet,
        key,
        source: this.source,
      });
    });
  }

  #refuseOnceClosed(handle: string): void {
    if (this.#closed) {
      const { step, attempt } = this.source;
      throw new Error(
        `the ${handle} of attempt ${attempt.toString()} of step ${step} was used after the attempt ended`,
      );
    }
  }

  /**
   * Runs `call` once every call made before it has settled, unless the
   * journey was aborted by then, and gives what it settles to. The promise
   * given is handled, so a step that does not await it never leaves a
   * rejection unhandled.
   */
  #inTurn(call: () => Promise<void>): Promise<void> {
    const journey = this.journey;
    const made = this.#last.then(() => unlessAborted(journey, call));
    this.#last = made.then(ignore, ignore);
    made.catch(ignore);
    return made;
  }

  /** Aborts the journey with `abort` in its turn, as {@link #inTurn} runs a call. */
  #abortInTurn(abort: Abort): Promise<void> {
    return this.#inTurn(() => Promise.reject(this.journey.abort(abort)));
  }

  /**
   * The executor's signal for `abort`, thrown at once into the step, the
   * abort itself recorded in its turn.
   */
  #aborting(abort: Abort): JourneyAbortError {
    void this.#abortInTurn(abort);
    return new JourneyAbortError(abort);
  }
}

function unlessAborted(
  journey: Journey,
  call: () => Promise<void>,
): Promise<void> {
  const { recorded } = journey;
  return recorded === undefined
    ? call()
    : Promise.reject(new JourneyAbortError(recorded));
}

function ignore(): void {
  // Each call settles on its own; the next one runs whatever the last did.
}
