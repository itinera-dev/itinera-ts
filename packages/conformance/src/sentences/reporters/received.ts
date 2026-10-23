import { isDeepStrictEqual } from "node:util";
import { Then } from "@cucumber/cucumber";
import type { Event, EventKind } from "itinera/unstable";
import { eventKind } from "../../model.js";
import { eventsOf as recorded } from "../../recorders.js";
import { kindOf, type Numbered, numbered } from "../../trace.js";
import { expectOfStream, holds } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>(
  "the reporters {names} received the same events",
  function (reporters: string[]) {
    const [first, ...others] = reporters.map(receivedBy(this));
    for (const other of others) {
      holds(
        isDeepStrictEqual(other.numbered, first?.numbered),
        `"${other.name}" to receive the events "${String(first?.name)}" received`,
        JSON.stringify(other.events.map(kindOf)),
      );
    }
  },
);

/** What a reporter received: its events, and each one's sequence number and line. */
interface Received {
  readonly name: string;
  readonly events: readonly Event[];
  readonly numbered: readonly Numbered[];
}

function receivedBy(world: World): (name: string) => Received {
  return (name) => receivedFrom(world, name);
}

function receivedFrom(world: World, name: string): Received {
  const events = received(world, name);
  return { name, events, numbered: events.map(numbered) };
}

/** Every event the reporters made under the name received, in order. */
function received(world: World, name: string): readonly Event[] {
  return world.recorders.receivers(name).flatMap(recorded);
}

Then<World>(
  "the reporter {string} received the event {string}",
  function (reporter: string, event: string) {
    receivedTimes(this, reporter, eventKind(event), atLeastOnce);
  },
);

Then<World>(
  "the reporter {string} received the event {string} {int} times",
  function (reporter: string, event: string, times: number) {
    receivedTimes(this, reporter, eventKind(event), exactly(times));
  },
);

Then<World>(
  "the reporter {string} did not receive the event {string}",
  function (reporter: string, event: string) {
    receivedTimes(this, reporter, eventKind(event), never);
  },
);

/** How often a reporter is expected to receive an event, and how that reads. */
interface Times {
  readonly said: string;
  readonly isMetBy: (count: number) => boolean;
}

const atLeastOnce: Times = { said: "at least once", isMetBy: isPositive };

const never: Times = { said: "never", isMetBy: isZero };

function exactly(times: number): Times {
  return { said: `${String(times)} times`, isMetBy: equalTo(times) };
}

function isPositive(count: number): boolean {
  return count > 0;
}

function isZero(count: number): boolean {
  return count === 0;
}

function equalTo(times: number): (count: number) => boolean {
  return (count) => isEqual(count, times);
}

function isEqual(count: number, times: number): boolean {
  return count === times;
}

function receivedTimes(
  world: World,
  reporter: string,
  kind: EventKind,
  times: Times,
): void {
  const events = received(world, reporter);
  expectOfStream(
    times.isMetBy(events.filter(ofKind(kind)).length),
    `"${reporter}" to receive ${kind} ${times.said}`,
    events,
  );
}

function ofKind(kind: EventKind): (event: Event) => boolean {
  return (event) => isOfKind(event, kind);
}

function isOfKind(event: Event, kind: EventKind): boolean {
  return event.kind === kind;
}

Then<World>(
  "the reporter {string} received no event",
  function (reporter: string) {
    const events = received(this, reporter);
    expectOfStream(
      events.length === 0,
      `"${reporter}" to receive no event`,
      events,
    );
  },
);
