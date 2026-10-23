import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import {
  entries,
  json,
  valueType,
  valueTypes,
} from "../../../src/model/value.js";

describe("values and types", () => {
  it.each(valueTypes)("reads %s, a type of the neutral vocabulary", (name) => {
    expect(valueType(name)).toBe(name);
  });

  it("refuses a type outside the neutral vocabulary", () => {
    expect(() => valueType("float")).toThrow(
      new ModelError('"float" is not a type of the neutral vocabulary'),
    );
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
