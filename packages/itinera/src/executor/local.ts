import { runJourney } from "../engine.js";
import type { Script } from "../engine/script.js";
import { isInstance, type WorkflowInstance } from "../instance/made.js";
import type { JourneyResult } from "../journey.js";
import type { DispatcherFactory } from "../report.js";
import { DefaultDispatcherFactory } from "../report/default-dispatcher.js";
import { Refusal } from "./refusal.js";

let scripting: (
  executor: LocalExecutor,
  instance: WorkflowInstance,
  script: Script,
) => Promise<JourneyResult>;

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
 * {@includeCode ../../examples/local-executor.ts}
 */
export class LocalExecutor {
  static {
    scripting = (executor, instance, script) => executor.#run(instance, script);
  }

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
   *
   * @throws TypeError, as a rejection, when `instance` was not made by
   * `instance()` on a workflow object, which only a cast lets through.
   */
  run(instance: WorkflowInstance): Promise<JourneyResult> {
    return this.#run(instance);
  }

  async #run(
    instance: WorkflowInstance,
    script?: Script,
  ): Promise<JourneyResult> {
    if (!isInstance(instance)) {
      throw new TypeError(
        "run was given an instance that instance() did not make: make the workflow object with its class's build(), then call instance() on it",
      );
    }
    if (this.#running) {
      throw new Refusal({ kind: "journey running" });
    }
    this.#running = true;
    try {
      return await runJourney(instance, this.#dispatcherFactory, now, script);
    } finally {
      this.#running = false;
    }
  }
}

/**
 * Runs the journey of `instance` on `executor`, as `run` does, playing
 * `script` for a scripted run.
 */
export function runScripted(
  executor: LocalExecutor,
  instance: WorkflowInstance,
  script: Script,
): Promise<JourneyResult> {
  return scripting(executor, instance, script);
}

function now(): Date {
  return new Date();
}
