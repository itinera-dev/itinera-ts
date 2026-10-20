import { isDeepStrictEqual } from "node:util";
import { type DataTable, Given, Then } from "@cucumber/cucumber";
import type { GlobalMetadataEntry } from "itinera/testing";
import type { PlainValue } from "itinera/value";
import {
  globalMetadataUnder,
  json,
  keyAndValue,
  nonValue,
  type Row,
  rows,
  scripted,
} from "../model.js";
import { entriesOf } from "../recorders.js";
import { holds } from "../unmet.js";
import type { World } from "../world.js";
import { carriesNone, isUnder, valueOf } from "./reporters/carried.js";

Given<World>(
  "the workflow instance is created with the global metadata:",
  function (table: DataTable) {
    this.model.initialGlobalMetadata.push(...rows(table).map(keyAndValue));
  },
);

Given<World>(
  "the workflow instance is created with a non-value as global metadata {string}",
  function (key: string) {
    this.model.initialGlobalMetadata.push([key, nonValue]);
  },
);

/** Both sentences of a step setting global metadata, a value or a non-value. */
Given<World>(
  /^step "([^"]*)" sets the global metadata "([^"]*)" to (.+)$/,
  function (step: string, key: string, written: string) {
    this.model.step(step).actions.push({
      kind: "set global metadata",
      key,
      value: written === "a non-value" ? nonValue : scripted(written),
    });
  },
);

Given<World>(
  "the reporter {string} fails when it receives the global metadata {string}",
  function (reporter: string, key: string) {
    this.model.fails(reporter, { kind: "on global metadata", key });
  },
);

Then<World>(
  "no engine event carries the global metadata value of {string}",
  function (key: string) {
    carriesNone(this, key, "global metadata value", [
      ...this.model.initialGlobalMetadata.filter(isUnder(key)).flatMap(valueOf),
      ...[...this.model.workflow.scripts.values()].flatMap((script) =>
        globalMetadataUnder(script, key),
      ),
      ...this.model.providers.scripts.flatMap((script) =>
        globalMetadataUnder(script, key),
      ),
    ]);
  },
);

Then<World>(
  "the reporter {string} received the global metadata:",
  function (reporter: string, table: DataTable) {
    const expected = rows(table).map(expectedEntry);
    const entries = receivedBy(this, reporter);
    holds(
      entries.length === expected.length && expected.every(matchedIn(entries)),
      `"${reporter}" to receive the global metadata ${JSON.stringify(expected)}`,
      writtenEntries(entries),
    );
  },
);

Then<World>(
  "the reporters {names} received the same global metadata",
  function (reporters: string[]) {
    const [first, ...others] = reporters.map(keyedBy(this));
    for (const other of others) {
      holds(
        isDeepStrictEqual(other.entries, first?.entries),
        `"${other.name}" to receive the global metadata "${String(first?.name)}" received`,
        JSON.stringify(other.entries),
      );
    }
  },
);

/**
 * An entry a table expects, each part compared only when its cell is not
 * empty; `after` is the kind of the event before it, or `none`.
 */
interface ExpectedEntry {
  readonly key?: string;
  readonly value?: PlainValue;
  readonly after?: string;
}

function expectedEntry(row: Row): ExpectedEntry {
  const key = row.optional("key");
  const value = row.optional("value");
  const after = row.optional("after");
  return {
    ...(key === undefined ? {} : { key }),
    ...(value === undefined ? {} : { value: json(value) }),
    ...(after === undefined ? {} : { after }),
  };
}

function matchedIn(
  entries: readonly GlobalMetadataEntry[],
): (expected: ExpectedEntry, place: number) => boolean {
  return (expected, place) => matches(entries[place], expected);
}

function matches(
  entry: GlobalMetadataEntry | undefined,
  { key, value, after }: ExpectedEntry,
): boolean {
  return (
    entry !== undefined &&
    (key === undefined || entry.key === key) &&
    (value === undefined || isDeepStrictEqual(entry.value, value)) &&
    (after === undefined || afterOf(entry) === after)
  );
}

/** Every entry the reporters made under the name received, in order. */
function receivedBy(world: World, name: string): GlobalMetadataEntry[] {
  return world.recorders.receivers(name).flatMap(entriesOf);
}

/** What a reporter received: each entry's key and value, in order. */
interface Keyed {
  readonly name: string;
  readonly entries: readonly (readonly [string, PlainValue])[];
}

function keyedBy(world: World): (name: string) => Keyed {
  return (name) => keyedFrom(world, name);
}

function keyedFrom(world: World, name: string): Keyed {
  return { name, entries: receivedBy(world, name).map(keyAndValueOf) };
}

function keyAndValueOf({
  key,
  value,
}: GlobalMetadataEntry): readonly [string, PlainValue] {
  return [key, value];
}

function writtenEntries(entries: readonly GlobalMetadataEntry[]): string {
  return JSON.stringify(entries.map(writtenEntry));
}

function writtenEntry(entry: GlobalMetadataEntry) {
  return { key: entry.key, value: entry.value, after: afterOf(entry) };
}

/** The kind of the event before the entry, or `none`, as a table writes it. */
function afterOf({ after }: GlobalMetadataEntry): string {
  return after.unwrapOr("none");
}
