/**
 * The tables that define policies and their hooks, and what the hooks
 * request, one row standing for the sentences of one hook or one request.
 */
import { type DataTable, Given } from "@cucumber/cucumber";
import { caseType, ModelError, rows, type Row } from "../../model.js";
import type {
  HookRequest,
  HookReturn,
  PolicyKind,
} from "../../model/policy.js";
import type { World } from "../../world.js";
import { plainRequests } from "../hooks.js";

/** Both "policies and their hooks" tables, of step policies and of workflow policies. */
Given<World>(
  /^the (step|workflow) policies and their hooks:$/,
  function (kind: PolicyKind, table: DataTable) {
    for (const row of rows(table)) {
      row.refuseColumnsBeyond([
        "policy",
        "hook",
        "returns",
        "code",
        "fails with",
      ]);
      const policy = row.required("policy");
      const hook = row.required("hook");
      this.model.policies.define(kind, policy, hook);
      const ending = endingOf(row);
      if (ending !== undefined) {
        this.model.policies.hook(policy, hook).ending = ending;
      }
    }
  },
);

/** How the row's hook ends, when its `returns` or `fails with` cell says. */
function endingOf(row: Row): HookReturn | undefined {
  const returns = row.optional("returns");
  const message = row.optional("fails with");
  if (returns !== undefined && message !== undefined) {
    throw new ModelError("a hook both returns and fails");
  }
  if (returns !== "FailWorkflow" && row.optional("code") !== undefined) {
    throw new ModelError("a code needs FailWorkflow under returns");
  }
  if (message !== undefined) {
    return { kind: "fail", message };
  }
  switch (returns) {
    case undefined:
      return undefined;
    case "FinishWorkflow":
      return { kind: "finish workflow" };
    case "FailWorkflow":
      return { kind: "fail workflow", code: row.required("code") };
    default:
      throw new ModelError(`"${returns}" is not a lifecycle a hook returns`);
  }
}

Given<World>("the hooks request:", function (table: DataTable) {
  for (const row of rows(table)) {
    row.refuseColumnsBeyond([
      "policy",
      "hook",
      "request",
      "key",
      "type",
      "optional",
    ]);
    this.model.policies
      .hook(row.required("policy"), row.required("hook"))
      .requests.push(requestOf(row));
  }
});

/** The request the row's `request` cell names, optional when `optional` is yes. */
function requestOf(row: Row): HookRequest {
  const request = row.required("request");
  const optional = isOptional(row);
  if (request === "step data" || request === "data from the workflow") {
    return {
      kind: request,
      key: row.required("key"),
      type: caseType(row.required("type")),
      optional,
    };
  }
  const named = optional ? `optional ${request}` : request;
  if (request.startsWith("optional ") || !isPlainRequest(named)) {
    throw new ModelError(`"${named}" is not a request a hook makes`);
  }
  return plainRequests[named];
}

function isOptional(row: Row): boolean {
  const optional = row.optional("optional");
  if (optional !== undefined && optional !== "yes") {
    throw new ModelError(`"${optional}" is not valid for optional; write yes`);
  }
  return optional === "yes";
}

function isPlainRequest(named: string): named is keyof typeof plainRequests {
  return Object.hasOwn(plainRequests, named);
}
