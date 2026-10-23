import { describe, expect, it } from "vitest";
import { Attempt, nextAttempt } from "../../src/step.js";

describe("Attempt", () => {
  it("counts the first attempt as 1", () => {
    expect(Attempt.first.number).toBe(1);
  });

  it("counts each attempt after the one before", () => {
    expect(nextAttempt(nextAttempt(Attempt.first)).number).toBe(3);
  });

  it.each([
    ["the first attempt", Attempt.first, true],
    ["a retry", nextAttempt(Attempt.first), false],
  ])("knows whether it is the first: %s", (_, attempt, first) => {
    expect(attempt.isFirst()).toBe(first);
  });

  it("writes itself as its number as text", () => {
    expect(String(nextAttempt(Attempt.first))).toBe("2");
  });

  it("writes itself as its number in JSON", () => {
    expect(JSON.stringify({ attempt: Attempt.first })).toBe('{"attempt":1}');
  });

  it("cannot be changed", () => {
    expect(Object.isFrozen(nextAttempt(Attempt.first))).toBe(true);
  });
});
