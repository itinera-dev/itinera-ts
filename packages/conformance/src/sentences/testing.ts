/**
 * The sentences of test support's recording reporter, its path, and fake
 * providers.
 */
import { isDeepStrictEqual } from "node:util";
import { type DataTable, Given, Then } from "@cucumber/cucumber";
import type { PlainValue } from "itinera/value";
import { json, rows, scripted } from "../model.js";
import type { Implementation } from "../model/provider.js";
import type { Row } from "../model/table.js";
import { holds } from "../unmet.js";
import type { World } from "../world.js";

Given<World>(
  "the instance has the recording reporter of test support",
  function () {
    this.model.testing.addRecordingReporter();
  },
);

Then<World>("the path is:", function (table: DataTable) {
  expectPath(this, rows(table).map(lineOf));
});

Then<World>("the path is empty", function () {
  expectPath(this, []);
});

Then<World>(
  "the recording reporter of test support kept the same events as the reporter {string}",
  function (reporter: string) {
    const kept = this.tested.recordingReporter.events;
    const received = this.recorders.receivers(reporter).at(-1)?.events;
    holds(
      isDeepStrictEqual(kept, received),
      `the recording reporter of test support to keep the events "${reporter}" received, ${JSON.stringify(received)}`,
      JSON.stringify(kept),
    );
  },
);

Then<World>(
  "the recording reporter of test support kept the global metadata:",
  function (table: DataTable) {
    const expected = new Map(rows(table).map(entryOf));
    const kept = this.tested.recordingReporter.globalMetadata;
    holds(
      isDeepStrictEqual(new Map(kept), expected),
      `the recording reporter of test support to keep ${JSON.stringify([...expected])}`,
      JSON.stringify([...kept]),
    );
  },
);

Given<World>(
  "the test replaces the service provider {string} with a fake that makes instances of {implementation}",
  function (provider: string, implementation: Implementation) {
    this.model.testing.fake(provider, { kind: "makes", implementation });
  },
);

Given<World>(
  "the test replaces the service provider {string} with a fake that makes instances of {implementation} and supplies the data {}",
  function (provider: string, implementation: Implementation, data: string) {
    this.model.testing.fake(provider, {
      kind: "makes",
      implementation,
      data: scripted(data),
    });
  },
);

Given<World>(
  "the test replaces the service provider {string} with a fake that fails with {string}",
  function (provider: string, message: string) {
    this.model.testing.fake(provider, { kind: "fails", message });
  },
);

Given<World>(
  "the test replaces the service provider {string} with a fake that makes meters",
  function (provider: string) {
    this.model.testing.fake(provider, { kind: "makes meters" });
  },
);

Then<World>(
  "the fake of {string} was called {int} times",
  function (provider: string, times: number) {
    const calls = this.tested.fakes.callsTo(provider);
    holds(
      calls === times,
      `the fake of "${provider}" to be called ${String(times)} times`,
      String(calls),
    );
  },
);

function expectPath(world: World, expected: readonly string[]): void {
  const { path } = world.tested.recordingReporter;
  holds(
    isDeepStrictEqual(path, expected),
    `the path ${JSON.stringify(expected)}`,
    JSON.stringify(path),
  );
}

function lineOf(row: Row): string {
  return row.required("line");
}

function entryOf(row: Row): [string, PlainValue] {
  return [row.required("key"), json(row.required("value"))];
}
