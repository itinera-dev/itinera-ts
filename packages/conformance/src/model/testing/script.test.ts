import { DataTable } from "@cucumber/cucumber";
import { describe, expect, it } from "vitest";
import { ModelError } from "../error.js";
import { rows } from "../table.js";
import { type ScriptRow, scriptRows } from "./script.js";

/** The rows of a script whose table has these columns, then these lines. */
function scriptOf(
  columns: string[],
  ...lines: string[][]
): readonly ScriptRow[] {
  return scriptRows(rows(new DataTable([columns, ...lines])));
}

describe("scriptRows", () => {
  it("reads each row's step, attempts, actions and ending, in the order written", () => {
    expect(
      scriptOf(
        [
          "step",
          "attempt",
          "contributes",
          "emits",
          "emit message",
          "sets global metadata",
          "ending",
          "code",
        ],
        [
          "charge",
          "1",
          '{"charged": 40, "currency": "EUR"}',
          "step_warning",
          "slow",
          '{"gateway": "main"}',
          "failure",
          "declined",
        ],
        ["charge", "remaining", "", "", "", "", "success", ""],
      ),
    ).toEqual([
      {
        step: "charge",
        attempt: 1,
        contributes: [
          ["charged", 40],
          ["currency", "EUR"],
        ],
        emits: { level: "warning", message: "slow" },
        setsGlobalMetadata: [["gateway", "main"]],
        ending: { kind: "failure", code: "declined" },
      },
      {
        step: "charge",
        attempt: "remaining",
        contributes: [],
        setsGlobalMetadata: [],
        ending: { kind: "success" },
      },
    ]);
  });

  it.each([
    ["a skip without a reason", ["skipped", "", ""], { kind: "skipped" }],
    [
      "a skip for a reason",
      ["skipped", "paid", ""],
      { kind: "skipped", code: "paid" },
    ],
    [
      "an abnormal termination",
      ["abnormal termination", "", "gateway down"],
      { kind: "abnormal termination", message: "gateway down" },
    ],
    ["the real run", ["real run", "", ""], { kind: "real run" }],
  ])("reads %s", (_, cells, ending) => {
    const [row] = scriptOf(
      ["step", "attempt", "ending", "code", "message"],
      ["charge", "every", ...cells],
    );
    expect(row?.ending).toEqual(ending);
  });

  it.each([
    ["an attempt that is no number", ["charge", "first", "success"]],
    ["an ending the script has not", ["charge", "1", "paused"]],
  ])("refuses %s", (_, line) => {
    expect(() => scriptOf(["step", "attempt", "ending"], line)).toThrow(
      ModelError,
    );
  });
});
