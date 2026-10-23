import { describe, expect, it } from "vitest";
import type { PlainValue } from "../../../src/value.js";
import { Some } from "../../../src/option.js";
import { integer, optional } from "../../../src/value/token.js";
import { dataBagFor, dataBagOf } from "../../../src/journey/data-bag.js";

const order = new Map<string, PlainValue>([
  ["shop", "corner"],
  ["amount", 42],
]);

describe("DataBag", () => {
  it("lists its keys in the order each was first set", () => {
    expect(dataBagOf(order).keys()).toEqual(["shop", "amount"]);
  });

  it("keeps a copy of what it was made from", () => {
    const values = new Map([["order", "A-1"]]);
    const dataBag = dataBagOf(values);
    values.set("shop", "corner");
    expect(dataBag.keys()).toEqual(["order"]);
  });

  it.each([
    ["required", integer, { kind: "present", value: 42 }],
    ["optional", optional(integer), { kind: "present", value: Some(42) }],
  ])("reads a key as the type asked for, %s", (_, type, read) => {
    expect(dataBagOf(order).read("amount", type)).toEqual(
      expect.objectContaining(read),
    );
  });
});

describe("dataBagFor", () => {
  it("shows what it was made from until it is closed", () => {
    const { dataBag } = dataBagFor(order);
    expect(dataBag.keys()).toEqual(["shop", "amount"]);
    expect(dataBag.read("amount", integer).kind).toBe("present");
  });

  it("shows nothing once closed: no key, and every read absent", () => {
    const access = dataBagFor(order);
    access.close();
    expect(access.dataBag.keys()).toEqual([]);
    expect(access.dataBag.read("amount", integer).kind).toBe("absent");
  });
});
