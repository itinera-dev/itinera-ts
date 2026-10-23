import { describe, expect, it } from "vitest";
import {
  fromBag,
  isSupplied,
  supplied,
} from "../../../../src/workflow/adapter/supplied.js";

describe("isSupplied", () => {
  it.each([
    ["a value supplied", supplied("A-1")],
    ["reading the data bag", fromBag],
  ])("accepts what the helpers make: %s", (_, returned) => {
    expect(isSupplied(returned)).toBe(true);
  });

  it.each([
    ["a value a cast makes", { kind: "supplied", value: "A-1" }],
    ["reading the data bag a cast makes", { kind: "fromDataBag" }],
    ["nothing", undefined],
  ])("refuses %s", (_, returned) => {
    expect(isSupplied(returned)).toBe(false);
  });
});
