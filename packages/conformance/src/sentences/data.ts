import { type DataTable, Given } from "@cucumber/cucumber";
import { keyAndValue, nonValue, rows } from "../model.js";
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
  "step {string} contributes a non-value as {string}",
  function (step: string, key: string) {
    this.model
      .step(step)
      .actions.push({ kind: "contribute", key, value: nonValue });
  },
);

Given<World>(
  "step {string} fails with code {string} and details that are not a value",
  function (step: string, code: string) {
    this.model.ends(step, [
      {
        outcome: { kind: "failure", reason: { code, details: nonValue } },
        contributes: [],
      },
    ]);
  },
);

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
