import type { Event } from "itinera/event";
import { runnersRecorder } from "../executor.js";
import { ModelError } from "../model/error.js";
import type { Model } from "../model.js";
import {
  eventsOf,
  type Recorders,
  type ScenarioReporter,
} from "../recorders.js";
import type { Journey } from "../journeys.js";

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
