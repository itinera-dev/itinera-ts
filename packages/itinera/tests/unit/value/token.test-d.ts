import { describe, expectTypeOf, it } from "vitest";
import {
  integer,
  listOf,
  objectOf,
  type Optional,
  optional,
} from "../../../src/value/token.js";

describe("optional", () => {
  it("does not compile inside a list", () => {
    // @ts-expect-error a list's items are never optional
    listOf(optional(integer));
  });

  it("does not compile inside a shape", () => {
    // @ts-expect-error a shape marks a property optional with Zod's .optional()
    objectOf({ amount: optional(integer) });
  });

  it("is made only by optional", () => {
    // @ts-expect-error only optional makes one
    const made: Optional<typeof integer> = {};
    expectTypeOf(made).not.toBeNever();
  });
});
