/**
 * The sentences that declare the workflow and its steps, with what the
 * columns of their steps table say of each step.
 */
import { type DataTable, Given } from "@cucumber/cucumber";
import {
  attempts,
  caseType,
  type Model,
  ModelError,
  succeeds,
} from "../../model.js";
import { type ServiceRequest, serviceTypeNamed } from "../../model/provider.js";
import type { Attempts, Input } from "../../model/step.js";
import { Row, rows } from "../../model/table.js";
import type { World } from "../../world.js";

Given<World>(
  "a workflow {string} with the steps:",
  function (name: string, table: DataTable) {
    declare(this.model, name, rows(table));
  },
);

Given<World>(
  "a workflow {string} with the policies {names} and the steps:",
  function (name: string, policies: string[], table: DataTable) {
    declare(this.model, name, rows(table));
    this.model.policies.attachToWorkflow(policies);
  },
);

function declare(model: Model, name: string, steps: readonly Row[]): void {
  model.declare(name, steps.map(stepName));
  for (const row of steps) {
    scriptStep(model, row);
  }
}

function stepName(row: Row): string {
  return row.required("step");
}

/** Scripts the row's step as the sentences its filled cells stand for do. */
function scriptStep(model: Model, row: Row): void {
  row.refuseColumnsBeyond(stepColumns);
  const step = stepName(row);
  const script = model.step(step);
  const policies = row.optional("policies");
  if (policies !== undefined) {
    script.policies = listed(policies);
  }
  script.inputs.push(...requested(row, "inputs").map(requiredInput));
  script.services.push(...requested(row, "services").map(service));
  const outcome = row.optional("outcome");
  if (outcome !== undefined) {
    model.ends(step, endings(outcome, row));
  } else if (row.optional("code") !== undefined) {
    throw new ModelError(`the row of "${step}" has a code and no outcome`);
  }
  const rescue = row.optional("rescue");
  if (rescue === "yes") {
    model.rescue(step);
  } else if (rescue !== undefined) {
    throw new ModelError(`"${rescue}" is not a valid rescue; write yes`);
  }
}

const stepColumns = [
  "step",
  "policies",
  "inputs",
  "services",
  "outcome",
  "code",
  "rescue",
];

function listed(cell: string): string[] {
  return cell.split(",").map(trimmed);
}

function trimmed(text: string): string {
  return text.trim();
}

/** The `key: type` pairs of a column, in the order written. */
function requested(row: Row, column: string): [string, string][] {
  const cell = row.optional(column);
  return cell === undefined ? [] : listed(cell).map(keyAndType);
}

function keyAndType(written: string): [string, string] {
  const at = written.indexOf(":");
  if (at === -1) {
    throw new ModelError(`"${written}" is not written key: type`);
  }
  return [written.slice(0, at).trim(), written.slice(at + 1).trim()];
}

function requiredInput([key, type]: [string, string]): Input {
  return { key, type: caseType(type), optional: false };
}

function service([key, type]: [string, string]): ServiceRequest {
  return { key, type: serviceTypeNamed(type) };
}

/**
 * How every attempt ends, for an `outcome` cell: success, or a failure of
 * the code in the `code` cell, as an attempts row would script it.
 */
function endings(outcome: string, row: Row): Attempts {
  switch (outcome) {
    case "success":
      if (row.optional("code") !== undefined) {
        throw new ModelError("a step that succeeds has no code");
      }
      return [succeeds];
    case "failure":
      return attempts([failureRow(row.required("code"))]);
    default:
      throw new ModelError(
        `"${outcome}" is not a valid outcome for every attempt`,
      );
  }
}

function failureRow(code: string): Row {
  return new Row(
    new Map([
      ["attempt", "1"],
      ["outcome", "failure"],
      ["code", code],
    ]),
  );
}
