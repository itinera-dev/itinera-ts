import { type DataTable, Given } from "@cucumber/cucumber";
import {
  aThrowingRecord,
  keyAndValue,
  nonValue,
  rows,
  type Scripted,
} from "../model.js";
import type { World } from "../world.js";

Given<World>("the data bag is empty", function () {
  this.model.emptyDataBag();
});

Given<World>("the data bag contains:", function (table: DataTable) {
  this.model.initialData.push(...rows(table).map(keyAndValue));
});

Given<World>(
  "the data bag contains a non-value as {string}",
  function (key: string) {
    this.model.initialData.push([key, nonValue]);
  },
);

Given<World>(
  "the data bag contains a throwing record as {string}",
  function (key: string) {
    this.model.initialData.push([key, aThrowingRecord]);
  },
);

Given<World>(
  "step {string} contributes a non-value as {string}",
  function (step: string, key: string) {
    contributes(this, step, key, nonValue);
  },
);

Given<World>(
  "step {string} contributes a throwing record as {string}",
  function (step: string, key: string) {
    contributes(this, step, key, aThrowingRecord);
  },
);

function contributes(
  world: World,
  step: string,
  key: string,
  value: Scripted,
): void {
  world.model.step(step).actions.push({ kind: "contribute", key, value });
}

Given<World>(
  "step {string} fails with code {string} and details that are not a value",
  function (step: string, code: string) {
    failsWith(this, step, code, nonValue);
  },
);

Given<World>(
  "step {string} fails with code {string} and a throwing record as details",
  function (step: string, code: string) {
    failsWith(this, step, code, aThrowingRecord);
  },
);

function failsWith(
  world: World,
  step: string,
  code: string,
  details: Scripted,
): void {
  world.model.ends(step, [
    {
      outcome: { kind: "failure", reason: { code, details } },
      contributes: [],
    },
  ]);
}

Given<World>(
  "step {string} ignores failures of its emit calls and carries on",
  function (step: string) {
    this.model.step(step).ignoresFailedEmits = true;
  },
);

Given<World>(
  "step {string} keeps its contributor and step reporter",
  function (step: string) {
    this.model.step(step).keepsHandles = true;
  },
);
