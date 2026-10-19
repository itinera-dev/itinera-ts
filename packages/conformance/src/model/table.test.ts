import { DataTable } from "@cucumber/cucumber";
import { describe, expect, it } from "vitest";
import { ModelError } from "./error.js";
import { keyAndValue, rows } from "./table.js";

function rowsOf(...lines: string[][]) {
  return rows(new DataTable(lines));
}

describe("a sentence's table", () => {
  it("reads each row by the column names of its header", () => {
    const [first, second] = rowsOf(
      ["step", "attempt"],
      ["charge", "1"],
      ["ship", "2"],
    );
    expect(first?.required("step")).toBe("charge");
    expect(second?.required("attempt")).toBe("2");
  });

  it("counts an empty cell as no cell", () => {
    const [row] = rowsOf(["code", "message"], ["", "late"]);
    expect(row?.optional("code")).toBeUndefined();
    expect(row?.optional("message")).toBe("late");
  });

  it("refuses to read a required cell that is empty", () => {
    const [row] = rowsOf(["code"], [""]);
    expect(() => row?.required("code")).toThrow(
      new ModelError("a row has no code"),
    );
  });

  it("reads a key with its value as JSON", () => {
    const [row] = rowsOf(["key", "value"], ["total", "42"]);
    expect(row && keyAndValue(row)).toEqual([
      "total",
      { kind: "value", value: 42 },
    ]);
  });
});
