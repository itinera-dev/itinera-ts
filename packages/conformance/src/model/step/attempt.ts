import type { PlainValue } from "itinera/unstable";
import { ModelError } from "../error.js";
import type { Row } from "../table.js";
import { entries, scripted, type Scripted } from "../value.js";

/** How one attempt of a scripted step ends, and what it contributes first. */
export interface AttemptScript {
  readonly outcome: AttemptOutcome;
  /** The keys and values it contributes before ending, in order. */
  readonly contributes: readonly (readonly [string, PlainValue])[];
}

/**
 * How an attempt ends: success, failure with a reason, skipped with or
 * without one, or an error escaping the step, an abnormal termination, with
 * the error's message when the case gives one.
 */
export type AttemptOutcome =
  | { readonly kind: "success" }
  | { readonly kind: "failure"; readonly reason: ScriptedReason }
  | { readonly kind: "skipped"; readonly reason?: ScriptedReason }
  | { readonly kind: "error"; readonly message?: string };

/** A reason as the cases write it: a code, and a message and details if any. */
export interface ScriptedReason {
  readonly code: string;
  readonly message?: string;
  readonly details?: Scripted;
}

/** An attempt that succeeds and contributes nothing. */
export const succeeds: AttemptScript = {
  outcome: { kind: "success" },
  contributes: [],
};

/** How each attempt of a step ends: at least one, the last repeating. */
export type Attempts = readonly [AttemptScript, ...AttemptScript[]];

/**
 * The attempts of a step attempts table, one per row, numbered from 1 in
 * order; it has at least one row.
 */
export function attempts(rows: readonly Row[]): Attempts {
  const [first, ...rest] = rows.map(attempt);
  if (first === undefined) {
    throw new ModelError("the table scripts no attempt");
  }
  return [first, ...rest];
}

function attempt(row: Row, index: number): AttemptScript {
  const number = row.required("attempt");
  if (number !== String(index + 1)) {
    throw new ModelError(
      `attempt ${number} is out of order; rows count attempts from 1`,
    );
  }
  const contributes = row.optional("contributes");
  return {
    outcome: outcome(row),
    contributes: contributes === undefined ? [] : entries(contributes),
  };
}

function outcome(row: Row): AttemptOutcome {
  const written = row.required("outcome");
  switch (written) {
    case "success":
      return { kind: "success" };
    case "failure":
      return { kind: "failure", reason: reason(row) };
    case "skipped":
      return row.optional("code") === undefined
        ? { kind: "skipped" }
        : { kind: "skipped", reason: reason(row) };
    case "error":
      return errorOutcome(row.optional("message"));
    default:
      throw new ModelError(`"${written}" is not a valid outcome`);
  }
}

function errorOutcome(message: string | undefined): AttemptOutcome {
  return message === undefined ? { kind: "error" } : { kind: "error", message };
}

function reason(row: Row): ScriptedReason {
  const message = row.optional("message");
  const details = row.optional("details");
  return {
    code: row.required("code"),
    ...(message === undefined ? {} : { message }),
    ...(details === undefined ? {} : { details: scripted(details) }),
  };
}
