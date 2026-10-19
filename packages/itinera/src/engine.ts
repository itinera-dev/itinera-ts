/**
 * The engine, private to itinera and never exported: it runs one journey of
 * a workflow instance, from what comes before it to its result.
 *
 * @module
 */
import type { WorkflowInstance } from "./instance.js";
import { type JourneyResult, type JourneyStatus } from "./journey.js";
import { dataBagOf } from "./journey/data-bag.js";
import { resultOf } from "./journey/result.js";
import type { DispatcherFactory } from "./report.js";
import { type Clock, Emitter } from "./engine/emitter.js";
import { Journey } from "./engine/journey.js";
import { travel } from "./engine/scan.js";
import { JourneyAbortError } from "./engine/signal.js";
import { start } from "./engine/start.js";

/**
 * Runs the journey of `instance`, delivering its events through a
 * dispatcher `factory` makes, and stamping them with the time `clock` gives.
 * Whatever happens in the journey is in its result.
 *
 * @throws Refusal when the instance is refused, or something before the
 * journey fails.
 */
export async function runJourney(
  instance: WorkflowInstance,
  factory: DispatcherFactory,
  clock: Clock,
): Promise<JourneyResult> {
  const { data, dispatcher, failures } = await start(instance, factory);
  const { descriptor, journeyId } = instance;
  const journey = new Journey(
    new Emitter(journeyId, descriptor.name, clock),
    dispatcher,
    failures,
  );
  return resultOf(journeyId, await ended());

  async function ended(): Promise<JourneyStatus> {
    try {
      const failure = await travel(journey, descriptor.steps(), [
        ...data.keys(),
      ]);
      const dataBag = dataBagOf(data);
      return failure === undefined
        ? { kind: "succeeded", dataBag }
        : { kind: "failed", failure, dataBag };
    } catch (thrown) {
      if (!(thrown instanceof JourneyAbortError)) {
        throw thrown;
      }
      await journey.deliverAborted(thrown.abort);
      return { kind: "aborted", abort: thrown.abort };
    }
  }
}
