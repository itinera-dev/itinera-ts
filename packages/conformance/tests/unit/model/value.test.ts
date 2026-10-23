import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import {
  aThrowingRecord,
  caseType,
  convertedTypes,
  entries,
  json,
  nonValue,
  type Scripted,
  valueTypes,
  written,
} from "../../../src/model/value.js";

describe("values and types", () => {
  it.each(valueTypes)("reads %s, a type of the neutral vocabulary", (name) => {
    expect(caseType(name)).toBe(name);
  });

  it.each(convertedTypes)("reads %s, a converted type", (name) => {
    expect(caseType(name)).toBe(name);
  });

  it("refuses a type the cases do not name", () => {
    expect(() => caseType("float")).toThrow(
      new ModelError('"float" is not a type the cases name'),
    );
  });

  it.each<[string, string, Scripted]>([
    ["a non-value", "a non-value", nonValue],
    ["a throwing record", "a throwing record", aThrowingRecord],
    ["a value written as JSON", "[1]", { kind: "value", value: [1] }],
  ])("reads what is written in the place of a value: %s", (_, text, read) => {
    expect(written(text)).toEqual(read);
  });

  it.each([
    ["a string", '"text"', "text"],
    ["an integer", "42", 42],
    ["a list", "[1, 2]", [1, 2]],
    ["an object", '{"a": 1}', { a: 1 }],
    ["null", "null", null],
  ])("reads %s written as JSON", (_, text, value) => {
    expect(json(text)).toEqual(value);
  });

  it("refuses what is not JSON", () => {
    expect(() => json("ten")).toThrow(new ModelError("ten is not JSON"));
  });

  it("keeps an object's entries in the order written", () => {
    expect(entries('{"z": 1, "a": "x"}')).toEqual([
      ["z", 1],
      ["a", "x"],
    ]);
  });

  it("refuses entries of what is not a JSON object", () => {
    expect(() => entries("[1]")).toThrow(
      new ModelError("[1] is not a JSON object"),
    );
  });
});
