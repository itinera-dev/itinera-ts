/**
 * What the scenario's When sentences do: build the workflow, then run its
 * journeys, keeping what each gave for the Then sentences.
 */
import type { Event } from "itinera/event";
import { Refusal } from "itinera/executor";
import type { JourneyResult } from "itinera/journey";
import { type Built, Violations } from "itinera/workflow";
import { ModelError } from "./model/error.js";
import type { Model } from "./model.js";
import {
  eventsOf,
  type Recorders,
  type ScenarioReporter,
} from "./recorders.js";
import { executorOf, runnersRecorder } from "./executor.js";
import { workflowOf } from "./scenario.js";
import { runScript } from "./script.js";
import type { Scenario } from "./scenario/workflow.js";
import type { Tested } from "./tested.js";
import type { Witness } from "./witness.js";

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
  const executor = executorOf(model.dispatching, recorders);
  const journeys: Journey[] = [];
  for (let run = 0; run < times; run += 1) {
    const instance = tested.instanceOf(workflow, model, recorders);
    journeys.push({
      journeyId: instance.journeyId,
      ended: await endedOf(executor.run(instance)),
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

/**
 * The event stream of one of the scenario's journeys: what the reporter the
 * runner's dispatchers hold received of it, or, under the default
 * dispatcher, what the first reporter the workflow lists that never failed
 * received, made for that journey. With no journey given, it is everything
 * the held reporter received, or nothing under the default dispatcher,
 * since no listed reporter was made.
 */
export function streamOf(
  model: Model,
  recorders: Recorders,
  journeys: readonly Journey[],
  journey: Journey | undefined,
): readonly Event[] {
  const { dispatching } = model;
  if (dispatching.kind === "default") {
    return journey === undefined
      ? []
      : firstThatNeverFailed(model, recorders, journeys.indexOf(journey))
          .events;
  }
  const held =
    dispatching.kind === "holding" ? dispatching.reporter : runnersRecorder;
  const events = recorders.made(held).flatMap(eventsOf);
  return journey === undefined
    ? events
    : events.filter(ofJourney(journey.journeyId));
}

/** Whether an event is of the journey. */
export function ofJourney(journeyId: string): (event: Event) => boolean {
  return (event) => isOf(event, journeyId);
}

function isOf(event: Event, journeyId: string): boolean {
  return event.journeyId === journeyId;
}

function firstThatNeverFailed(
  model: Model,
  recorders: Recorders,
  place: number,
): ScenarioReporter {
  const found = (model.workflow.reporters ?? [])
    .map(madeFor(recorders, place))
    .find(neverFailed);
  if (found === undefined) {
    throw new ModelError(
      "every reporter the workflow lists failed, so no complete stream is left to read",
    );
  }
  return found;
}

/** The reporter made under a name for the journey at this place. */
function madeFor(
  recorders: Recorders,
  place: number,
): (name: string) => ScenarioReporter | undefined {
  return (name) => madeAt(recorders, name, place);
}

function madeAt(
  recorders: Recorders,
  name: string,
  place: number,
): ScenarioReporter | undefined {
  return recorders.made(name)[place];
}

function neverFailed(
  reporter: ScenarioReporter | undefined,
): reporter is ScenarioReporter {
  return reporter !== undefined && !reporter.failed;
}
