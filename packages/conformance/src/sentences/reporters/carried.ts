import { Then } from "@cucumber/cucumber";
import type { Event } from "itinera/event";
import type { PlainValue } from "itinera/value";
import { contributedUnder, ModelError, type Scripted } from "../../model.js";
import {
  carriesMessage,
  carriesValue,
  type Line,
  lineOf,
} from "../../trace.js";
import { expectOfStream } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "every event carries the journey ID {string} and the workflow name {string}, with increasing sequence numbers",
  function (id: string, workflow: string) {
    const events = this.stream();
    expectOfStream(
      events.length > 0 &&
        events.every(belongsTo(id, workflow)) &&
        events.every(followsThe(events)),
      `every event of "${workflow}" for "${id}", in increasing sequence`,
      events,
    );
  },
);

function belongsTo(id: string, workflow: string): (event: Event) => boolean {
  return (event) => isOf(event, id, workflow);
}

function isOf(event: Event, id: string, workflow: string): boolean {
  return event.journeyId === id && event.workflow === workflow;
}

/** Whether each event's sequence number is greater than the one before it. */
function followsThe(
  events: readonly Event[],
): (event: Event, place: number) => boolean {
  return (event, place) => follows(events, event, place);
}

function follows(
  events: readonly Event[],
  event: Event,
  place: number,
): boolean {
  const before = events[place - 1];
  return before === undefined || before.sequence < event.sequence;
}

Then<World>(
  "no engine event carries the value of {string}",
  function (key: string) {
    carriesNone(this, key, "value", [
      ...this.model.initialData.filter(isUnder(key)).flatMap(valueOf),
      ...[...this.model.workflow.scripts.values()].flatMap((script) =>
        contributedUnder(script, key),
      ),
    ]);
  },
);

/**
 * Holds when no engine event carries any of `values`, which the scenario
 * gives under `key` as its `what`.
 *
 * @throws ModelError when the scenario gives no value under the key.
 */
export function carriesNone(
  world: World,
  key: string,
  what: string,
  values: readonly PlainValue[],
): void {
  if (values.length === 0) {
    throw new ModelError(`the scenario gives "${key}" no ${what}`);
  }
  const events = world.stream();
  expectOfStream(
    !events.filter(isEngineEvent).map(lineOf).some(carryingAny(values)),
    `no engine event to carry the ${what} of "${key}"`,
    events,
  );
}

/** Whether an entry the scenario gives, of data or global metadata, is under `key`. */
export function isUnder(
  key: string,
): (entry: readonly [string, Scripted]) => boolean {
  return ([under]) => isKey(under, key);
}

function isKey(under: string, key: string): boolean {
  return under === key;
}

/** The value of an entry the scenario gives, or none when it is not a value. */
export function valueOf([, given]: readonly [string, Scripted]): PlainValue[] {
  return given.kind === "value" ? [given.value] : [];
}

const emitted = new Set<string>([
  "step_info",
  "step_warning",
  "step_error",
  "journey_info",
  "journey_warning",
  "journey_error",
]);

/** Whether the engine emitted the event, rather than a step, hook or provider. */
function isEngineEvent(event: Event): boolean {
  return !emitted.has(event.kind);
}

function carryingAny(values: readonly PlainValue[]): (line: Line) => boolean {
  return (line) => values.some(carriedBy(line));
}

function carriedBy(line: Line): (value: PlainValue) => boolean {
  return (value) => carriesValue(line, value);
}

Then<World>(
  "no event carries the message {string}",
  function (message: string) {
    const events = this.stream();
    expectOfStream(
      !events.map(lineOf).some(carrying(message)),
      `no event to carry "${message}"`,
      events,
    );
  },
);

function carrying(message: string): (line: Line) => boolean {
  return (line) => carriesMessage(line, message);
}
