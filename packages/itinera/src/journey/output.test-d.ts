import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { Option } from "../option.js";
import { Payment } from "../engine/fixtures.js";
import { classOf, integer, listOf, optional, string } from "../value/token.js";
import type { JourneyResult } from "./result.js";

declare const result: JourneyResult;

describe("JourneyResult.output", () => {
  it("reads each key as the type its schema checks", () => {
    expectTypeOf(
      result.output({ receipt: string, lines: listOf(integer) }),
    ).toEqualTypeOf<{ readonly receipt: string; readonly lines: number[] }>();
  });

  it("reads an Option under a key whose type is optional", () => {
    expectTypeOf(result.output({ note: optional(string) })).toEqualTypeOf<{
      readonly note: Option<string>;
    }>();
  });

  it("reads an instance under a key read as a class", () => {
    expectTypeOf(result.output({ paid: classOf(Payment) })).toEqualTypeOf<{
      readonly paid: Payment;
    }>();
  });

  it("reads as any other Standard Schema validator checks", () => {
    expectTypeOf(
      result.output({ shop: z.enum(["corner", "market"]) }),
    ).toEqualTypeOf<{ readonly shop: "corner" | "market" }>();
  });

  it("takes only types under each key", () => {
    // @ts-expect-error A key's type is a schema, not a value.
    result.output({ receipt: "R-1" });
  });
});
