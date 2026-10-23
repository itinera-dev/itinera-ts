import { DataTable } from "@cucumber/cucumber";
import { describe, expect, it } from "vitest";
import { ModelError } from "../../../../src/model/error.js";
import { rows } from "../../../../src/model/table.js";
import { attempts } from "../../../../src/model/step/attempt.js";

function table(...lines: string[][]) {
  return rows(new DataTable([["attempt", "outcome"], ...lines]));
}

describe("a step's attempts", () => {
  it("reads each outcome, its reason and what the attempt contributes", () => {
    expect(
      attempts(
        rows(
          new DataTable([
            ["attempt", "outcome", "code", "message", "details", "contributes"],
            ["1", "failure", "declined", "no funds", '{"limit": 5}', ""],
            ["2", "skipped", "", "", "", ""],
            ["3", "skipped", "empty", "", "", ""],
            ["4", "error", "", "timeout", "", ""],
            ["5", "error", "", "", "", ""],
            ["6", "success", "", "", "", '{"paid": true}'],
          ]),
        ),
      ),
    ).toEqual([
      {
        outcome: {
          kind: "failure",
          reason: {
            code: "declined",
            message: "no funds",
            details: { kind: "value", value: { limit: 5 } },
          },
        },
        contributes: [],
      },
      { outcome: { kind: "skipped" }, contributes: [] },
      {
        outcome: { kind: "skipped", reason: { code: "empty" } },
        contributes: [],
      },
      { outcome: { kind: "error", message: "timeout" }, contributes: [] },
      { outcome: { kind: "error" }, contributes: [] },
      { outcome: { kind: "success" }, contributes: [["paid", true]] },
    ]);
  });

  it("counts attempts from 1, in order", () => {
    expect(() => attempts(table(["2", "success"]))).toThrow(
      new ModelError("attempt 2 is out of order; rows count attempts from 1"),
    );
  });

  it("refuses an outcome outside the four", () => {
    expect(() => attempts(table(["1", "crash"]))).toThrow(
      new ModelError('"crash" is not a valid outcome'),
    );
  });

  it("refuses a table that scripts no attempt", () => {
    expect(() => attempts(table())).toThrow(
      new ModelError("the table scripts no attempt"),
    );
  });
});
