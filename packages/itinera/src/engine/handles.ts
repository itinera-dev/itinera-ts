import { EventKind } from "../event/kind.js";
import { AbortReason, type Abort, type Contributor } from "../journey.js";
import type { HookReporter } from "../policy.js";
import type { ProviderReporter } from "../service.js";
import type { StepReporter } from "../step.js";
import type { PlainValue } from "../value.js";
import { capture } from "../value/capture.js";
import {
  blamed,
  described,
  emitted,
  emittedKind,
  type Holder,
  type Level,
  setter,
} from "./handles/holder.js";
import type { Journey } from "./journey.js";
import { JourneyAbortError } from "./signal.js";
import { journeyIdKey } from "./start.js";

/**
 * The handles itinera lends one attempt of a step, or one call of a hook or
 * of a service provider: its contributor, which a provider is never lent,
 * and its reporter, a step reporter, a hook reporter or a provider reporter.
 * They keep what was contributed, and run every call that emits or sets
 * global metadata in the order it was made, each once the one before has
 * settled, so a call that is not awaited keeps its place. Once the attempt
 * or the call ends they are closed: a call then throws where it is made,
 * and changes nothing.
 */
export class Handles {
  /** What was contributed, by key, in the order first contributed. */
  readonly contributed = new Map<string, PlainValue>();
  /** The contributor lent. */
  readonly contributor: Contributor;
  /**
   * The reporter lent: a step's, a hook's or a provider's, which have the
   * same calls.
   */
  readonly reporter: StepReporter & HookReporter & ProviderReporter;
  #closed = false;
  #last: Promise<void> = Promise.resolve();

  constructor(
    private readonly journey: Journey,
    private readonly holder: Holder,
  ) {
    this.contributor = Object.freeze({
      contribute: (key: string, value: unknown) => {
        this.#contribute(key, value);
      },
    });
    this.reporter = Object.freeze({
      info: (message: string, data?: unknown) =>
        this.#emit("info", message, data),
      warning: (message: string, data?: unknown) =>
        this.#emit("warning", message, data),
      error: (message: string, data?: unknown) =>
        this.#emit("error", message, data),
      setGlobalMetadata: (key: string, value: unknown) =>
        this.#setGlobalMetadata(key, value),
    });
  }

  /**
   * Closes both handles, for good, once every call made on the reporter has
   * settled, those made while earlier ones settled included, so none is
   * accepted after the engine stopped waiting.
   */
  async closed(): Promise<void> {
    let last: Promise<void>;
    do {
      last = this.#last;
      await last;
    } while (last !== this.#last);
    this.#closed = true;
  }

  #contribute(key: string, value: unknown): void {
    this.#refuseOnceClosed("contributor");
    const captured = capture(value);
    if (captured.isErr()) {
      throw this.#aborting({
        reason: AbortReason.NotAValue,
        ...blamed(this.holder),
        key,
      });
    }
    this.contributed.set(key, captured.value);
  }

  #emit(level: Level, message: string, data: unknown): Promise<void> {
    this.#refuseOnceClosed("reporter");
    const { holder } = this;
    if (data === undefined) {
      return this.#inTurn(() =>
        this.journey.emit(emitted(holder, level, message, undefined)),
      );
    }
    const captured = capture(data);
    if (captured.isErr()) {
      return this.#abortInTurn({
        reason: AbortReason.NotAValue,
        ...blamed(holder),
        eventKind: emittedKind(holder, level),
      });
    }
    return this.#inTurn(() =>
      this.journey.emit(emitted(holder, level, message, captured.value)),
    );
  }

  #setGlobalMetadata(key: string, value: unknown): Promise<void> {
    this.#refuseOnceClosed("reporter");
    const { holder } = this;
    if (key === journeyIdKey) {
      return this.#abortInTurn({
        reason: AbortReason.ReservedMetadataKey,
        ...blamed(holder),
        key,
        source: setter(holder),
      });
    }
    const captured = capture(value);
    if (captured.isErr()) {
      return this.#abortInTurn({
        reason: AbortReason.NotAValue,
        ...blamed(holder),
        key,
      });
    }
    return this.#inTurn(async () => {
      await this.journey.setGlobalMetadata(key, captured.value);
      await this.journey.emit({
        kind: EventKind.GlobalMetadataSet,
        key,
        source: holder,
      });
    });
  }

  #refuseOnceClosed(handle: "contributor" | "reporter"): void {
    if (this.#closed) {
      const { holder } = this;
      const isStep = holder.kind === "step";
      const lent =
        handle === "contributor" ? handle : `${borrowerOf(holder)} reporter`;
      throw new Error(
        `the ${lent} of ${described(holder)} was used after ${isStep ? "the attempt ended" : "it returned"}`,
      );
    }
  }

  /**
   * Runs `call` once every call made before it has settled, unless the
   * journey was aborted by then, and gives what it settles to. The promise
   * given is handled, so code that does not await it never leaves a
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
   * The executor's signal for `abort`, thrown at once into the code, the
   * abort itself recorded in its turn.
   */
  #aborting(abort: Abort): JourneyAbortError {
    void this.#abortInTurn(abort);
    return new JourneyAbortError(abort);
  }
}

/** Who a reporter is lent to, as a message about one used too late says. */
function borrowerOf(holder: Holder): "step" | "hook" | "provider" {
  switch (holder.kind) {
    case "step":
      return "step";
    case "provider":
      return "provider";
    case "step hook":
    case "workflow hook":
      return "hook";
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
