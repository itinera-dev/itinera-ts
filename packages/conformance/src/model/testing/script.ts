import type { PlainValue } from "itinera/value";
import { ModelError } from "../error.js";
import type { Level } from "../step.js";
import type { Row } from "../table.js";
import { entries } from "../value.js";

/** Which attempts a row of the script chooses. */
type Chosen = number | "every" | "remaining";

/** How the attempts a row chooses end, or `real run` for the real step. */
export type ScriptEnding =
  | { readonly kind: "success" }
  | { readonly kind: "failure"; readonly code: string }
  | { readonly kind: "skipped"; readonly code?: string }
  | { readonly kind: "abnormal termination"; readonly message: string }
  | { readonly kind: "real run" };

/** One row of a script: the attempts of a step it chooses, and what they do. */
export interface ScriptRow {
  readonly step: string;
  readonly attempt: Chosen;
  /** The keys and values contributed, in the order written. */
  readonly contributes: readonly (readonly [string, PlainValue])[];
  /** The event emitted, if any. */
  readonly emits?: { readonly level: Level; readonly message: string };
  /** The entries of global metadata set, in the order written. */
  readonly setsGlobalMetadata: readonly (readonly [string, PlainValue])[];
  readonly ending: ScriptEnding;
}

/** The rows of a script, in the order written. */
export function scriptRows(rows: readonly Row[]): readonly ScriptRow[] {
  return rows.map(scriptRow);
}

function scriptRow(row: Row): ScriptRow {
  const emits = row.optional("emits");
  const ending = endingOf(row);
  const read = {
    step: row.required("step"),
    attempt: chosen(row.required("attempt")),
    contributes: entriesOf(row, "contributes"),
    setsGlobalMetadata: entriesOf(row, "sets global metadata"),
    ending,
  };
  return emits === undefined
    ? read
    : {
        ...read,
        emits: { level: levelOf(emits), message: row.required("emit message") },
      };
}

function chosen(written: string): Chosen {
  if (written === "every" || written === "remaining") {
    return written;
  }
  if (!/^-?\d+(\.\d+)?$/.test(written)) {
    throw new ModelError(`"${written}" chooses no attempt`);
  }
  return Number(written);
}

function entriesOf(
  row: Row,
  column: string,
): readonly (readonly [string, PlainValue])[] {
  const written = row.optional(column);
  return written === undefined ? [] : entries(written);
}

const levels: Readonly<Record<string, Level>> = {
  step_info: "info",
  step_warning: "warning",
  step_error: "error",
};

function levelOf(emits: string): Level {
  const level = levels[emits];
  if (level === undefined) {
    throw new ModelError(`"${emits}" is not an event a step emits`);
  }
  return level;
}

function endingOf(row: Row): ScriptEnding {
  const written = row.required("ending");
  switch (written) {
    case "success":
      return { kind: "success" };
    case "failure":
      return { kind: "failure", code: row.required("code") };
    case "skipped":
      return skippedFor(row.optional("code"));
    case "abnormal termination":
      return { kind: "abnormal termination", message: row.required("message") };
    case "real run":
      return { kind: "real run" };
    default:
      throw new ModelError(`"${written}" is not an ending of a script`);
  }
}

function skippedFor(code: string | undefined): ScriptEnding {
  return code === undefined ? { kind: "skipped" } : { kind: "skipped", code };
}
