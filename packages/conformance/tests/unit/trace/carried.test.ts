import { describe, expect, it } from "vitest";
import { carriesMessage, carriesValue } from "../../../src/trace/carried.js";
import { abortedAt, stepInfo, stepSucceeded } from "../../fixtures/trace.js";
import { lineOf } from "../../../src/trace/line.js";

describe("carriesMessage", () => {
  it.each([
    ["the whole message", "disk full", true],
    ["only part of the message", "disk", false],
  ])(
    "finds the message of an error an event carries, given %s",
    (_, message, carried) => {
      expect(carriesMessage(lineOf(abortedAt("charge")), message)).toBe(
        carried,
      );
    },
  );
});

describe("carriesValue", () => {
  it.each([
    ["within its data", { amount: 42 }, true],
    ["written within its message", "A-1", true],
    ["nowhere", "B-2", false],
  ])("finds a value an event carries %s", (_, value, carried) => {
    const line = lineOf(
      stepInfo("charge", "charging A-1", { order: { amount: 42 } }),
    );
    expect(carriesValue(line, value)).toBe(carried);
  });

  it("never takes the names an event gives for data", () => {
    expect(carriesValue(lineOf(stepSucceeded("charge")), "charge")).toBe(false);
  });
});
