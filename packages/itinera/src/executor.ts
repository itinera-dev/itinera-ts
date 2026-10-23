/**
 * Executors, which run journeys, and what `run` rejects with when it refuses
 * an instance.
 *
 * @module
 */
import { runJourney } from "./engine.js";
import type { WorkflowInstance } from "./instance.js";
import type { JourneyResult } from "./journey.js";
import type { DispatcherFactory } from "./report.js";
import { DefaultDispatcherFactory } from "./report/default-dispatcher.js";
import { Refusal } from "./executor/refusal.js";

export type {
  DispatcherFactoryFailed,
  DispatcherFailed,
  GlobalMetadataNotSet,
  InitialValues,
  InstanceRan,
  JourneyRunning,
  Refused,
} from "./executor/refusal.js";
export { Refusal } from "./executor/refusal.js";

/**
 * Runs journeys in this process, one at a time, with no persistence: a
 * journey lives only as long as the call to `run` that runs it. It accepts
 * synchronous and asynchronous steps and reporters alike, and waits for
 * whatever they return.
 *
 * For each journey it makes a new dispatcher with its dispatcher factory, the
 * default one unless it is given another, and keeps nothing of the journey
 * once `run` settles. Several executors run journeys in parallel.
 *
 * {@includeCode ../examples/local-executor.ts}
 */
export class LocalExecutor {
  readonly #dispatcherFactory: DispatcherFactory;
  #running = false;

  /**
   * An executor whose journeys deliver their events through dispatchers that
   * `dispatcherFactory` makes, or default dispatchers when none is given.
   */
  constructor(
    dispatcherFactory: DispatcherFactory = new DefaultDispatcherFactory(),
  ) {
    this.#dispatcherFactory = dispatcherFactory;
  }

  /**
   * Runs the one journey of `instance`, and resolves to its result: it
   * succeeded or failed, with its data bag, or it was aborted. Nothing that
   * happens in the journey rejects.
   *
   * @throws Refusal, as a rejection, before any journey and any event: when
   * the executor is running a journey, the instance was handed to `run`
   * before, its initial data or global metadata is refused, or the
   * dispatcher factory, the dispatcher or a reporter fails before the
   * journey starts.
   */
  async run<W>(instance: WorkflowInstance<W>): Promise<JourneyResult> {
    if (this.#running) {
      throw new Refusal({ kind: "journey running" });
    }
    this.#running = true;
    try {
      return await runJourney(instance, this.#dispatcherFactory, now);
    } finally {
      this.#running = false;
    }
  }
}

function now(): Date {
  return new Date();
}
