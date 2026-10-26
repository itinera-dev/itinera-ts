import { describe, it } from "vitest";
import type { ValueOf } from "../../src/closed-set.js";
import { closedSet } from "../../src/closed-set/declare.js";

const Colour = closedSet({ Red: "red", Blue: "blue" });
declare function painting(colour: ValueOf<typeof Colour>): void;

describe("ClosedSet", () => {
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
