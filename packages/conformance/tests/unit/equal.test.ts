import { describe, expect, it } from "vitest";
import { equalTo } from "../../src/equal.js";

describe("equalTo", () => {
  it.each([
    ["an equal object", { attempt: 1, key: "label" }, true],
    ["an object with another value", { attempt: 2, key: "label" }, false],
    ["a value of another type", "1", false],
  ])("compares deeply and strictly, given %s", (_, found, equal) => {
    expect(equalTo({ attempt: 1, key: "label" })(found)).toBe(equal);
  });
});
