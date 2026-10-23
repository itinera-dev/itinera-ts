import { describe, expect, it } from "vitest";
import { isOutcome } from "../../../src/step/outcome.js";
import { Ending } from "../../../src/testing/ending.js";

describe("Ending", () => {
  it("gives the outcome a step returns to succeed", () => {
    expect(isOutcome(Ending.outcome(Ending.success))).toBe(true);
  });

  it("throws an error carrying the message for an abnormal termination", () => {
    expect(() =>
      Ending.outcome(Ending.abnormalTermination("gateway down")),
    ).toThrow(new Error("gateway down"));
  });

  it("makes frozen endings", () => {
    expect([
      Object.isFrozen(Ending.success),
      Object.isFrozen(Ending.abnormalTermination("down")),
    ]).toEqual([true, true]);
  });
});
