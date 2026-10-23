import { describe, expect, it } from "vitest";
import { rejectedRecordGuard, ThrowingRecord } from "../../src/converted.js";

describe("the converted types", () => {
  it("never turns a throwing record into a value", () => {
    expect(() => new ThrowingRecord().toValue()).toThrow(
      new Error("conversion failed"),
    );
  });

  it("never turns a value into a throwing record", () => {
    expect(() => ThrowingRecord.fromValue()).toThrow(
      new Error("conversion failed"),
    );
  });

  it.each([
    ["an object", { id: 7 }],
    ["a string", "stripe"],
    ["null", null],
  ])("says that no value is a rejected record: %s", (_, value) => {
    expect(rejectedRecordGuard.safeParse(value).success).toBe(false);
  });
});
