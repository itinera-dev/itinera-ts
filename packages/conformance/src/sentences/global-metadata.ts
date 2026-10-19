import { type DataTable, Given } from "@cucumber/cucumber";
import { keyAndValue, nonValue, rows, scripted } from "../model.js";
import type { World } from "../world.js";

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
