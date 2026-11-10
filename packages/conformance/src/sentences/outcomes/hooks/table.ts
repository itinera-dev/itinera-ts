/**
 * The table of what the hooks received, one row standing for the checks of
 * one hook, one filled cell for each.
 */
import { type DataTable, Then } from "@cucumber/cucumber";
import { equalTo } from "../../../equal.js";
import { ModelError, type Row, rows } from "../../../model.js";
import type { HookRequest } from "../../../model/policy.js";
import type { World } from "../../../world.js";
import { expectCalled } from "../hooks.js";
import {
  attemptNumbered,
  errorWith,
  expectAnswer,
  hasNoReason,
  isCause,
  isError,
  isFailureReason,
  kindOf,
} from "./received.js";

/** A check of one column: the request it reads, how it reads, and what matches. */
interface Check {
  readonly request: (request: HookRequest) => boolean;
  readonly expected: string;
  readonly matches: (found: unknown) => boolean;
}

/** The check each column but `calls` stands for, from what its cell says. */
const columns: Readonly<Record<string, (cell: string) => Check>> = {
  "attempt number": attemptNumber,
  "step name": (cell) => ({
    request: kindOf("step name"),
    expected: `the step name "${cell}"`,
    matches: equalTo(cell),
  }),
  "journey ID": (cell) => ({
    request: kindOf("journey ID"),
    expected: `the journey ID "${cell}"`,
    matches: equalTo(cell),
  }),
  cause: (cell) => ({
    request: isCause,
    expected: `the cause "${cell}"`,
    matches: equalTo(cell),
  }),
  error: (cell) => ({
    request: isError,
    expected: `the error "${cell}"`,
    matches: errorWith(cell),
  }),
  "failure reason": noFailureReason,
};

function attemptNumber(cell: string): Check {
  if (!/^\d+$/.test(cell)) {
    throw new ModelError(
      `"${cell}" under attempt number is not a whole number`,
    );
  }
  return {
    request: kindOf("attempt number"),
    expected: `the attempt number ${cell}`,
    matches: attemptNumbered(Number(cell)),
  };
}

function noFailureReason(cell: string): Check {
  if (cell !== "none") {
    throw new ModelError(
      "a failure reason with a code stays a sentence of its own; the table checks only none",
    );
  }
  return {
    request: isFailureReason,
    expected: "no failure reason",
    matches: hasNoReason,
  };
}

Then<World>("the hooks received:", function (table: DataTable) {
  for (const row of rows(table)) {
    const policy = row.required("policy");
    const hook = row.required("hook");
    if (row.optional("calls") !== undefined) {
      expectCalled(this, hook, policy, row.count("calls"));
    }
    for (const column of checked(row)) {
      const check = checkOf(column, row.required(column));
      expectAnswer(
        this,
        hook,
        policy,
        check.request,
        check.expected,
        check.matches,
      );
    }
  }
});

const named = new Set(["policy", "hook", "calls"]);

/** The row's filled columns that check what the hook received. */
function checked(row: Row): string[] {
  return row.columns().filter(isFilledCheck(row));
}

function isFilledCheck(row: Row): (column: string) => boolean {
  return (column) => isFilledCheckOf(row, column);
}

function isFilledCheckOf(row: Row, column: string): boolean {
  return !named.has(column) && row.optional(column) !== undefined;
}

function checkOf(column: string, cell: string): Check {
  const check = columns[column];
  if (check === undefined) {
    throw new ModelError(`"${column}" is not a column of the hooks received`);
  }
  if (cell === "none" && column !== "failure reason") {
    throw new ModelError(
      `${column} is never answered absent, so the table cannot check none`,
    );
  }
  return check(cell);
}
