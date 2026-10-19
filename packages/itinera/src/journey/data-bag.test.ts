import { describe, expect, it } from "vitest";
import { dataBagOf } from "./data-bag.js";

describe("DataBag", () => {
  it("lists its keys in the order each was first set", () => {
    expect(
      dataBagOf(
        new Map([
          ["shop", "corner"],
          ["order", "A-1"],
        ]),
      ).keys(),
    ).toEqual(["shop", "order"]);
  });

  it("keeps a copy of what it was made from", () => {
    const values = new Map([["order", "A-1"]]);
    const dataBag = dataBagOf(values);
    values.set("shop", "corner");
    expect(dataBag.keys()).toEqual(["order"]);
  });
});
