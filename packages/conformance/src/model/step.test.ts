import { describe, expect, it } from "vitest";
import { contribution, emit } from "./step.js";

describe("a step's contribution", () => {
  it("contributes the value written", () => {
    expect(contribution("total", '{"amount": 42}')).toEqual({
      kind: "contribute",
      key: "total",
      value: { kind: "value", value: { amount: 42 } },
    });
  });

  it("contributes a value and then changes it to the content written after", () => {
    expect(contribution("tags", '["a"] and then changes it to ["b"]')).toEqual({
      kind: "contribute then change",
      key: "tags",
      value: { kind: "value", value: ["a"] },
      changed: { kind: "value", value: ["b"] },
    });
  });
});

describe("a step's emit", () => {
  it("carries no data when the sentence gives none", () => {
    expect(emit("info", "charging", null)).toEqual({
      kind: "emit",
      level: "info",
      message: "charging",
    });
  });

  it("carries the data written as JSON", () => {
    expect(emit("warning", "slow", '{"ms": 900}')).toEqual({
      kind: "emit",
      level: "warning",
      message: "slow",
      data: { kind: "value", value: { ms: 900 } },
    });
  });

  it("carries a non-value when the sentence says the data is not a value", () => {
    expect(emit("error", "broken", "that is not a value")).toEqual({
      kind: "emit",
      level: "error",
      message: "broken",
      data: { kind: "non-value" },
    });
  });
});
