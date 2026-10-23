import { type DataTable, Given } from "@cucumber/cucumber";
import {
  attempts,
  contribution,
  rows,
  scripted,
  succeeds,
  type Row,
  type CaseType,
} from "../model.js";
import type { World } from "../world.js";

Given<World>(
  "a workflow {string} with the steps:",
  function (name: string, table: DataTable) {
    this.model.declare(name, rows(table).map(stepName));
  },
);

function stepName(row: Row): string {
  return row.required("step");
}

Given<World>(
  "step {string} requests input {string} of type {type}",
  function (step: string, key: string, type: CaseType) {
    this.model.step(step).inputs.push({ key, type, optional: false });
  },
);

Given<World>(
  "step {string} requests optional input {string} of type {type}",
  function (step: string, key: string, type: CaseType) {
    this.model.step(step).inputs.push({ key, type, optional: true });
  },
);

/** Both "contributes" sentences, since one begins as the other does. */
Given<World>(
  /^step "([^"]*)" contributes "([^"]*)" = (.+)$/,
  function (step: string, key: string, written: string) {
    this.model.step(step).actions.push(contribution(key, written));
  },
);

Given<World>("step {string} succeeds", function (step: string) {
  this.model.ends(step, [succeeds]);
});

Given<World>(
  /^step "([^"]*)" changes its input "([^"]*)" to (.+)$/,
  function (step: string, key: string, value: string) {
    this.model
      .step(step)
      .actions.push({ kind: "change input", key, value: scripted(value) });
  },
);

Given<World>(
  "step {string} attempts:",
  function (step: string, table: DataTable) {
    this.model.ends(step, attempts(rows(table)));
  },
);

Given<World>(
  "step {string} cannot be built because its constructor fails with {string}",
  function (step: string, message: string) {
    this.model.step(step).constructorFailure = message;
  },
);

Given<World>(
  "step {string} does not retry abnormal terminations",
  function (step: string) {
    this.model.step(step).retriesAbnormalTerminations = false;
  },
);

Given<World>(
  "step {string} allows {int} retries",
  function (step: string, retries: number) {
    this.model.step(step).retries = retries;
  },
);

Given<World>("step {string} has a rescue step", function (step: string) {
  this.model.rescue(step);
});

Given<World>(
  "step {string} requests rescued step data {string} of type {type}",
  function (step: string, key: string, type: CaseType) {
    this.model.rescueStep(step).rescueRequests.push({
      kind: "data",
      input: { key, type, optional: false },
    });
  },
);

Given<World>(
  "step {string} requests optional rescued step data {string} of type {type}",
  function (step: string, key: string, type: CaseType) {
    this.model.rescueStep(step).rescueRequests.push({
      kind: "data",
      input: { key, type, optional: true },
    });
  },
);

Given<World>(
  "step {string} requests the failure reason",
  function (step: string) {
    this.model.rescueStep(step).rescueRequests.push({ kind: "failure reason" });
  },
);

Given<World>("step {string} requests the error", function (step: string) {
  this.model.rescueStep(step).rescueRequests.push({ kind: "error" });
});
