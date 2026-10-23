import { describe, it } from "vitest";
import { closedSet, type ValueOf } from "../../src/closed-set.js";

const Colour = closedSet({ Red: "red", Blue: "blue" });
declare function painting(colour: ValueOf<typeof Colour>): void;

describe("closedSet", () => {
  it("gives a type that is only one of its values", () => {
    painting(Colour.Red);
    painting("blue");
    // @ts-expect-error not a value of the set
    painting("green");
  });

  it("cannot be changed", () => {
    // @ts-expect-error every name is read-only
    Colour.Red = "blue";
    // @ts-expect-error its values are read-only
    Colour.values[0] = "blue";
  });
});
