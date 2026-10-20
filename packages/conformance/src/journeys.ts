/**
 * What the scenario's When sentences do: build the workflow, then run its
 * journeys, keeping what each gave for the Then sentences.
 */
import { type LocalExecutor, Refusal } from "itinera/executor";
import type { WorkflowInstance } from "itinera/instance";
import type { JourneyResult } from "itinera/journey";
import { type Built, Violations } from "itinera/workflow";
import type { Model } from "./model.js";
import type { Recorders } from "./recorders.js";
import { executorOf, runnersRecorder } from "./executor.js";
import { workflowOf } from "./scenario.js";
import { runScript } from "./script.js";
import type { Scenario } from "./scenario/workflow.js";
import type { Tested } from "./tested.js";
import type { Witness } from "./witness.js";

export { ofJourney, streamOf } from "./journeys/stream.js";

/** What building the workflow gave: the workflow, or the violations refusing it. */
export type Admission =
  | { readonly kind: "admitted"; readonly workflow: Built<Scenario> }
  | { readonly kind: "refused"; readonly violations: Violations };

/** How one call to `run` ended: with the journey's result, or refused. */
type Ended =
  | { readonly kind: "result"; readonly result: JourneyResult }
  | { readonly kind: "refused"; readonly refusal: Refusal };

/** One journey the scenario ran, with the ID of its instance. */
export interface Journey {
  readonly journeyId: string;
  readonly ended: Ended;
}

/**
 * Builds the workflow the scenario declares, keeping the violations when the
 * builder refuses it.
 */
export function admitted(model: Model, witness: Witness): Admission {
  try {
    return { kind: "admitted", workflow: workflowOf(model, witness) };
  } catch (error) {
    if (error instanceof Violations) {
      return { kind: "refused", violations: error };
    }
    throw error;
  }
}

/**
 * Runs `times` journeys of the admitted workflow, one after another, on one
 * executor, each with a new instance made the same way.
 */
export async function ran(
  workflow: Built<Scenario>,
  model: Model,
  recorders: Recorders,
  tested: Tested,
  times: number,
): Promise<Journey[]> {
  return journeysOf(executorOf(model.dispatching, recorders), times, () =>
    tested.instanceOf(workflow, model, recorders),
  );
}

/**
 * Runs `times` journeys on the executor, one after another, each with a new
 * instance that `instance` makes.
 */
export async function journeysOf(
  executor: LocalExecutor,
  times: number,
  instance: () => WorkflowInstance,
): Promise<Journey[]> {
  const journeys: Journey[] = [];
  for (let run = 0; run < times; run += 1) {
    const made = instance();
    journeys.push({
      journeyId: made.journeyId,
      ended: await endedOf(executor.run(made)),
    });
  }
  return journeys;
}

/**
 * Runs one journey of the admitted workflow with the scenario's script,
 * through test support, on a local executor without a dispatcher factory,
 * the runner's recorder being the instance's first reporter.
 *
 * @throws TestMistake, as a rejection, when the script is mistaken or
 * leaves something out.
 */
export async function ranScripted(
  workflow: Built<Scenario>,
  model: Model,
  recorders: Recorders,
  tested: Tested,
): Promise<Journey[]> {
  const instance = tested.instanceOf(
    workflow,
    model,
    recorders,
    recorders.makerOf(runnersRecorder),
  );
  const { script, ensuresAll } = model.testing;
  const running = runScript(instance, script, ensuresAll);
  return [
    {
      journeyId: instance.journeyId,
      ended: await endedOf(running.then((run) => tested.keep(run))),
    },
  ];
}

/** How a call to `run` ended: with the journey's result, or refused. */
async function endedOf(running: Promise<JourneyResult>): Promise<Ended> {
  try {
    return { kind: "result", result: await running };
  } catch (error) {
    if (error instanceof Refusal) {
      return { kind: "refused", refusal: error };
    }
    throw error;
  }
}
