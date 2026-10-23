import { describe, expect, it } from "vitest";
import { integer, object, string } from "../../../src/value/token.js";
import { TestDataBag } from "../../../src/testing/test-data-bag.js";

describe("TestDataBag", () => {
  it("lends read access to the values it was given, in order", () => {
    const bag = new TestDataBag().with("order", "A-1").with("amount", 40);
    expect(bag.access.keys()).toEqual(["order", "amount"]);
    expect(bag.access.read("amount", integer).option().unwrap()).toBe(40);
  });

  it("leaves the bag it was made from as it was", () => {
    const empty = new TestDataBag();
    empty.with("order", "A-1");
    expect(empty.access.read("order", string).kind).toBe("absent");
  });

  it("keeps a value as it was when given", () => {
    const order = { lines: ["pen"] };
    const bag = new TestDataBag().with("order", order);
    order.lines.push("ink");
    expect(bag.access.read("order", object).option().unwrap()).toEqual({
      lines: ["pen"],
    });
  });

  it("throws a type error naming the key for what is not a value", () => {
    expect(() =>
      new TestDataBag().with("due", new Date() as unknown as string),
    ).toThrow(
      new TypeError(
        "the value given under due is not a value: is an object whose prototype is not plain",
      ),
    );
  });
});
