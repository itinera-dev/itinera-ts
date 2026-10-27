import { describe, expect, it } from "vitest";
import { isOf, whatIs } from "../../../src/engine/returned.js";
import { revoked } from "../../fixtures/proxy.js";

const asking = new Proxy(
  {},
  {
    getPrototypeOf() {
      throw new Error("trap");
    },
  },
);

describe("whatIs", () => {
  it.each<[string, unknown, string]>([
    ["undefined", undefined, "undefined"],
    ["null", null, "null"],
    ["text", "done", "a string"],
    ["a number", 7, "a number"],
    ["a function", String, "a function"],
    ["an object", {}, "an object"],
    ["a list", [], "an object"],
    ["a revoked proxy, without reading it", revoked(), "an object"],
  ])("says what custom code returned, for %s", (_, returned, what) => {
    expect(whatIs(returned)).toBe(what);
  });
});

describe("isOf", () => {
  it.each<[string, unknown, boolean]>([
    ["an object of the class", new Date(), true],
    ["another object", {}, false],
    ["a revoked proxy", revoked(), false],
    ["a proxy whose trap throws", asking, false],
  ])(
    "says whether custom code made an object of the class, without throwing, for %s",
    (_, made, is) => {
      expect(isOf(made, Date)).toBe(is);
    },
  );
});
