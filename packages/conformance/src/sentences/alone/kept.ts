/** The sentences about what the recorders kept of a step or a hook run alone. */
import { isDeepStrictEqual } from "node:util";
import { type DataTable, Then } from "@cucumber/cucumber";
import type { Emitted } from "itinera/testing";
import type { PlainValue } from "itinera/value";
import { z } from "itinera/schema";
import type { Call } from "../../alone/carrying-on.js";
import { json, rows } from "../../model.js";
import { ModelError } from "../../model/error.js";
import type { Row } from "../../model/table.js";
import { holds } from "../../unmet.js";
import type { World } from "../../world.js";

Then<World>("the contributions recorder holds:", function (table: DataTable) {
  const { contributions } = this.alone;
  const expected = rows(table).map(entryOf);
  for (const [key, value] of expected) {
    const read = contributions.read(key, z.json());
    holds(
      read.kind === "present" && isDeepStrictEqual(read.value, value),
      `the contributions recorder to hold "${key}" = ${JSON.stringify(value)}`,
      JSON.stringify(read),
    );
  }
  const keys = [...contributions.keys()].sort();
  const expectedKeys = expected.map(keyOf).sort();
  holds(
    isDeepStrictEqual(keys, expectedKeys),
    `the contributions recorder to hold the keys ${JSON.stringify(expectedKeys)}`,
    JSON.stringify(keys),
  );
});

Then<World>(
  /^the (step|hook) event reporter kept the events:$/,
  function (recorder: "step" | "hook", table: DataTable) {
    const expected = rows(table).map(expectedEmitted);
    const kept = emittedBy(this, recorder).map(writtenEmitted);
    holds(
      isDeepStrictEqual(kept, expected),
      `the ${recorder} event reporter to keep ${JSON.stringify(expected)}`,
      JSON.stringify(kept),
    );
  },
);

Then<World>(
  /^the (step|hook) event reporter kept nothing$/,
  function (recorder: "step" | "hook") {
    const kept = emittedBy(this, recorder);
    const entries = globalMetadataOf(this, recorder);
    holds(
      kept.length === 0 && entries.length === 0,
      `the ${recorder} event reporter to keep nothing`,
      JSON.stringify({ events: kept, globalMetadata: entries }),
    );
  },
);

Then<World>(
  "the step event reporter kept the global metadata:",
  function (table: DataTable) {
    const expected = rows(table).map(entryOf);
    const kept = globalMetadataOf(this, "step");
    holds(
      isDeepStrictEqual(kept, expected),
      `the step event reporter to keep the global metadata ${JSON.stringify(expected)}`,
      JSON.stringify(kept),
    );
  },
);

Then<World>(
  /^every call (step "[^"]*"|the hook "[^"]*" of policy "[^"]*") made to its (?:step|hook) reporter was interrupted$/,
  function (called: string) {
    this.alone.ensureCalled(called);
    const calls = reporterCalls(this);
    holds(
      calls.length > 0 && calls.every(isInterrupted),
      "every call to the reporter to be interrupted",
      JSON.stringify(calls),
    );
  },
);

Then<World>(
  "the call step {string} made setting {string}, and every call after it, was interrupted, and no call before it",
  function (step: string, key: string) {
    this.alone.ensureCalled(`step "${step}"`);
    const calls = reporterCalls(this);
    const setting = calls.findIndex(settingKey(key));
    if (setting === -1) {
      throw new ModelError(`the step never set "${key}"`);
    }
    holds(
      !calls.slice(0, setting).some(isInterrupted) &&
        calls.slice(setting).every(isInterrupted),
      `the call setting "${key}", and every call after it, to be interrupted, and no call before it`,
      JSON.stringify(calls),
    );
  },
);

/** The key and value a row of a table gives. */
export function entryOf(row: Row): [string, PlainValue] {
  return [row.required("key"), json(row.required("value"))];
}

function keyOf([key]: readonly [string, PlainValue]): string {
  return key;
}

/** An event a table expects a recorder to keep: its level, message and data, if it has any. */
interface WrittenEmitted {
  readonly level: string;
  readonly message: string;
  readonly data?: PlainValue;
}

function expectedEmitted(row: Row): WrittenEmitted {
  const data = row.optional("data") ?? "none";
  const written = {
    level: row.required("level"),
    message: row.required("message"),
  };
  return data === "none" ? written : { ...written, data: json(data) };
}

function writtenEmitted({ level, message, data }: Emitted): WrittenEmitted {
  return data.isSome()
    ? { level, message, data: data.value }
    : { level, message };
}

function emittedBy(
  world: World,
  recorder: "step" | "hook",
): readonly Emitted[] {
  const { stepEvents, hookEvents } = world.alone;
  return recorder === "step" ? stepEvents.emitted : hookEvents.emitted;
}

function globalMetadataOf(
  world: World,
  recorder: "step" | "hook",
): (readonly [string, PlainValue])[] {
  const { stepEvents, hookEvents } = world.alone;
  return [...(recorder === "step" ? stepEvents : hookEvents).globalMetadata];
}

function reporterCalls(world: World): readonly Call[] {
  return world.alone.calls.filter(onTheReporter);
}

function onTheReporter(call: Call): boolean {
  return call.handle === "reporter";
}

function isInterrupted(call: Call): boolean {
  return call.interrupted;
}

function settingKey(key: string): (call: Call) => boolean {
  return (call) => call.method === "setGlobalMetadata" && call.key === key;
}
