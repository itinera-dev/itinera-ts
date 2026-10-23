import { describe, expect, it } from "vitest";
import type { Checked } from "../../../src/declaration/request.js";
import { None, Some } from "../../../src/option.js";
import type { PlainValue } from "../../../src/value.js";
import { integer } from "../../../src/value/token.js";
import { readOf } from "../../../src/journey/read.js";

const required: Checked = { schema: integer, optional: false };
const optional: Checked = { schema: integer, optional: true };

describe("readOf", () => {
  it.each<[string, PlainValue | undefined, string]>([
    ["a value of the type asked for", 42, "present"],
    ["no value", undefined, "absent"],
    ["a value of another type", "forty-two", "other type"],
  ])("tells %s apart from the others", (_, stored, kind) => {
    expect(readOf(stored, required).kind).toBe(kind);
  });

  it("holds the value it found", () => {
    expect(readOf(42, required)).toMatchObject({ kind: "present", value: 42 });
  });

  it.each<[string, PlainValue | undefined, unknown]>([
    ["Some of a value of the type asked for", 42, Some(42)],
    ["None for no value", undefined, None],
    ["None for a value of another type", "forty-two", None],
  ])("gives as an option %s", (_, stored, option) => {
    expect(readOf(stored, required).option()).toEqual(option);
  });

  it.each<[string, PlainValue | undefined, unknown]>([
    ["Some of a value of the type asked for", 42, Some(42)],
    ["None for no value", undefined, None],
  ])("reads an optional type as present, holding %s", (_, stored, value) => {
    expect(readOf(stored, optional)).toMatchObject({ kind: "present", value });
  });

  it("reads a value of another type as such, even for an optional type", () => {
    expect(readOf("forty-two", optional).kind).toBe("other type");
  });

  it.each<[string, PlainValue | undefined]>([
    ["present", 42],
    ["absent", undefined],
    ["of another type", "forty-two"],
  ])("is frozen when %s", (_, stored) => {
    expect(Object.isFrozen(readOf(stored, required))).toBe(true);
  });
});
