import { describe, expect, it } from "vitest";
import { isOutcome, success } from "./outcome.js";

describe("isOutcome", () => {
  it("accepts an outcome itinera made", () => {
    expect(isOutcome(success)).toBe(true);
  });

  it.each([
    ["an object that looks like an outcome", { kind: "success" }],
    ["a value that is not an object", "success"],
    ["nothing", undefined],
  ])("refuses %s", (_, returned) => {
    expect(isOutcome(returned)).toBe(false);
  });
});
