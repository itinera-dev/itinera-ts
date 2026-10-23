import { describe, it } from "vitest";
import { TestDataBag } from "../../../src/testing/test-data-bag.js";

describe("TestDataBag", () => {
  it("holds only values", () => {
    // @ts-expect-error a function is not a value
    new TestDataBag().with("price", () => 40);
  });
});
