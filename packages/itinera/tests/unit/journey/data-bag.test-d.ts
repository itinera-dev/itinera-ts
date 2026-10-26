import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { Option } from "../../../src/option.js";
import type { PlainValue } from "../../../src/value.js";
import {
  classOf,
  integer,
  listOf,
  optional,
} from "../../../src/value/token.js";
import type { DataBag } from "../../../src/journey/data-bag.js";
import type { Read } from "../../../src/journey/read.js";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

declare const bag: DataBag;

describe("DataBag", () => {
  it("reads a value as the type its schema checks", () => {
    expectTypeOf(bag.read("amount", integer)).toEqualTypeOf<Read<number>>();
    expectTypeOf(bag.read("lines", listOf(integer))).toEqualTypeOf<
      Read<number[]>
    >();
  });

  it("reads an instance of a class named with classOf", () => {
    expectTypeOf(bag.read("payment", classOf(Payment))).toEqualTypeOf<
      Read<Payment>
    >();
  });

  it("reads an optional type as an option of the type it wraps", () => {
    expectTypeOf(bag.read("discount", optional(integer))).toEqualTypeOf<
      Read<Option<number>>
    >();
  });

  it("reads as the schema's input, not what it makes of it", () => {
    expectTypeOf(
      bag.read(
        "note",
        z.string().transform((text) => text.length),
      ),
    ).toEqualTypeOf<Read<string>>();
  });

  it("has no method that writes", () => {
    expectTypeOf<DataBag>().not.toHaveProperty("set");
    expectTypeOf<DataBag>().not.toHaveProperty("contribute");
  });
});

describe("Read", () => {
  it("holds a value only when one of the type asked for is present", () => {
    const read = bag.read("amount", integer);
    if (read.kind === "present") {
      expectTypeOf(read.value).toEqualTypeOf<number>();
    } else {
      // @ts-expect-error nothing of the type asked for is held
      expectTypeOf(read.value).toBeNever();
    }
    expectTypeOf(read.option()).toEqualTypeOf<Option<number>>();
  });
});
