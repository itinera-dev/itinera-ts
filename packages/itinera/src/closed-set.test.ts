import { describe, expect, it } from "vitest";
import { closedSet } from "./closed-set.js";

const Colour = closedSet({ Red: "red", DarkBlue: "dark blue" });

describe("closedSet", () => {
  it("gives each name its value", () => {
    expect([Colour.Red, Colour.DarkBlue]).toEqual(["red", "dark blue"]);
  });

  it("lists every value in the order it was declared", () => {
    expect(Colour.values).toEqual(["red", "dark blue"]);
  });

  it.each([
    ["a value", "dark blue", true],
    ["a value in another case", "Dark Blue", false],
    ["a name", "DarkBlue", false],
    ["a value with spaces around it", " red", false],
    ["the name of a member that is not a value", "values", false],
  ])("reads back only a value written exactly: %s", (_, text, read) => {
    expect(Colour.has(text)).toBe(read);
  });

  it("cannot be changed", () => {
    expect(Object.isFrozen(Colour)).toBe(true);
    expect(Object.isFrozen(Colour.values)).toBe(true);
  });
});
