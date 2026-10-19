import { describe, expect, it } from "vitest";
import { isOutcome } from "../../../src/step/outcome.js";
import { Ending } from "../../../src/testing/ending.js";

describe("Ending", () => {
  it.each([
    ["a success", Ending.success, { kind: "success" }],
    [
      "a failure for a reason",
      Ending.failure({ code: "declined", details: { limit: 5 } }),
      { kind: "failure", reason: { code: "declined", details: { limit: 5 } } },
    ],
    [
      "a failure for a code",
      Ending.failure("declined"),
      { kind: "failure", reason: { code: "declined" } },
    ],
    ["a skip", Ending.skip, { kind: "skipped" }],
    [
      "a skip for a code",
      Ending.skipBecause("nothing to do"),
      { kind: "skipped", reason: { code: "nothing to do" } },
    ],
  ])("gives the outcome a step returns for %s", (_, ending, expected) => {
    const outcome = Ending.outcome(ending);
    expect([isOutcome(outcome), outcome]).toEqual([true, expected]);
  });

  it("throws an error carrying the message for an abnormal termination", () => {
    expect(() =>
      Ending.outcome(Ending.abnormalTermination("gateway down")),
    ).toThrow(new Error("gateway down"));
  });

  it("makes frozen endings", () => {
    expect(
      [
        Ending.success,
        Ending.failure("declined"),
        Ending.skip,
        Ending.skipBecause("empty"),
        Ending.abnormalTermination("down"),
      ].map(Object.isFrozen),
    ).toEqual([true, true, true, true, true]);
  });
});
