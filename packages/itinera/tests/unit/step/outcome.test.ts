import { describe, expect, it } from "vitest";
import type { PlainValue } from "../../../src/value.js";
import {
  failure,
  hasDetailsRefused,
  isOutcome,
  skipped,
  success,
} from "../../../src/step/outcome.js";

const cycle: Record<string, unknown> = {};
cycle["self"] = cycle;

describe("isOutcome", () => {
  it.each([
    ["a success", success],
    ["a failure", failure("declined")],
    ["a skip", skipped()],
    ["a skip with a reason", skipped("nothing to do")],
  ])("accepts an outcome itinera made: %s", (_, outcome) => {
    expect(isOutcome(outcome)).toBe(true);
  });

  it.each([
    ["an object that looks like an outcome", { kind: "success" }],
    ["a value that is not an object", "success"],
    ["nothing", undefined],
  ])("refuses %s", (_, returned) => {
    expect(isOutcome(returned)).toBe(false);
  });
});

describe("failure", () => {
  it.each([
    ["only its code", "declined", { code: "declined" }],
    [
      "a code, a message and details",
      { code: "declined", message: "no funds", details: { limit: 5 } },
      { code: "declined", message: "no funds", details: { limit: 5 } },
    ],
  ])("carries the reason given as %s", (_, given, reason) => {
    expect(failure(given)).toEqual({ kind: "failure", reason });
  });

  it("captures the details when the reason is given", () => {
    const details = { limit: 5 };
    const outcome = failure({ code: "declined", details });
    details.limit = 6;
    expect(outcome.reason.details).toEqual({ limit: 5 });
  });

  it("turns details that serialise themselves into plain data", () => {
    const outcome = failure({
      code: "declined",
      details: { toValue: () => 5 },
    });
    expect(outcome.reason.details).toBe(5);
  });

  it("makes outcomes nothing can change", () => {
    const outcome = failure("declined");
    expect([Object.isFrozen(outcome), Object.isFrozen(outcome.reason)]).toEqual(
      [true, true],
    );
  });
});

describe("hasDetailsRefused", () => {
  it.each([
    ["a failure", failure({ code: "declined", details: cycle as PlainValue })],
    ["a skip", skipped({ code: "empty", details: cycle as PlainValue })],
  ])(
    "tells %s whose details are not a value, which its reason leaves out",
    (_, outcome) => {
      expect([hasDetailsRefused(outcome), outcome.reason]).toEqual([
        true,
        { code: outcome.reason?.code },
      ]);
    },
  );

  it.each([
    ["a success", success],
    ["a failure with details", failure({ code: "declined", details: 5 })],
    ["a skip without a reason", skipped()],
  ])("tells %s whose details are a value", (_, outcome) => {
    expect(hasDetailsRefused(outcome)).toBe(false);
  });
});
