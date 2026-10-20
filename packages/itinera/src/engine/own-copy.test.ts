import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { ownCopy } from "./own-copy.js";

class Declined extends Error {
  readonly limit = 5;
}

/** An error whose `details` throws when it is read. */
function withFaultyDetails(): Error {
  return Object.defineProperty(new Error("timeout"), "details", {
    enumerable: true,
    get(): never {
      throw new Error("no details");
    },
  });
}

/** An error behind a proxy that cannot list its own properties. */
function unlistable(): Error {
  return new Proxy(new Error("timeout"), {
    ownKeys(): never {
      throw new Error("no keys");
    },
  });
}

describe("ownCopy", () => {
  it.each<[string, unknown]>([
    ["a string", "timeout"],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
  ])("gives %s thrown as it is", (_, thrown) => {
    expect(ownCopy(thrown)).toBe(thrown);
  });

  it("gives a copy of an error, keeping its class, message, stack, cause and own properties", () => {
    const thrown = new Declined("declined", { cause: "limit" });
    const copy = ownCopy(thrown);
    // `not.toBe` would read the getter, comparing the two deeply.
    expect(Object.is(copy, thrown)).toBe(false);
    expect(copy).toBeInstanceOf(Declined);
    expect(copy).toMatchObject({
      message: "declined",
      stack: thrown.stack,
      cause: "limit",
      limit: 5,
    });
  });

  it("copies a getter that throws without calling it", () => {
    const thrown = withFaultyDetails();
    const copy = ownCopy(thrown);
    // `not.toBe` would read the getter, comparing the two deeply.
    expect(Object.is(copy, thrown)).toBe(false);
    assert(copy instanceof Error);
    expect(copy.message).toBe("timeout");
    expect((): unknown => Reflect.get(copy, "details")).toThrow("no details");
  });

  it("gives an error that cannot be copied as it is", () => {
    const thrown = unlistable();
    expect(ownCopy(thrown)).toBe(thrown);
  });
});
