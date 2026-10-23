import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { None, Some } from "../../../src/option.js";
import type { PlainValue } from "../../../src/value.js";
import { received } from "../../../src/value/read.js";
import {
  classOf,
  guard,
  integer,
  listOf,
  number,
  objectOf,
  string,
} from "../../../src/value/token.js";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    if (typeof value !== "number") {
      throw new TypeError("a payment is a number of cents");
    }
    return new Payment(value);
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

function isEven(value: unknown): value is number {
  return typeof value === "number" && value % 2 === 0;
}

function throwing(): boolean {
  throw new Error("broken check");
}

describe("received", () => {
  it.each<[string, PlainValue, StandardSchemaV1]>([
    ["a whole number as an integer", 42, integer],
    ["a fraction as a number", 4.5, number],
    ["a string", "EUR", string],
    ["a list of integers", [1, 2], listOf(integer)],
    ["an object of its shape", { amount: 3 }, objectOf({ amount: integer })],
  ])("gives %s that the schema accepts", (_, stored, schema) => {
    expect(received(stored, schema)).toEqual(Some(stored));
  });

  it.each<[string, PlainValue, StandardSchemaV1]>([
    ["a fraction as an integer", 4.5, integer],
    ["a number as a string", 42, string],
    ["a list with an item of another type", [1, "two"], listOf(integer)],
    ["an odd number to a guard of even numbers", 3, guard("even", isEven)],
    ["what makes the schema throw", 42, z.custom(throwing)],
    [
      "what an asynchronous schema checks",
      42,
      z.number().refine(async () => Promise.resolve(true)),
    ],
    ["what fromValue refuses", "twelve", classOf(Payment)],
    [
      "a null that fromValue refuses in an optional property",
      { paid: null },
      objectOf({ paid: classOf(Payment).optional() }),
    ],
  ])("gives nothing for %s", (_, stored, schema) => {
    expect(received(stored, schema)).toBe(None);
  });

  it("gives its own copy, which shares nothing with what is stored", () => {
    const stored = { lines: [{ sku: "A-1" }] };
    const value = received(stored, objectOf({})).unwrap() as typeof stored;
    value.lines[0] = { sku: "B-2" };
    expect(value).not.toBe(stored);
    expect(stored).toEqual({ lines: [{ sku: "A-1" }] });
  });

  it("gives the stored value, not what the schema makes of it", () => {
    expect(
      received(
        "EUR",
        z.string().transform((text) => text.length),
      ),
    ).toEqual(Some("EUR"));
  });

  it.each<[string, PlainValue, StandardSchemaV1, unknown]>([
    ["at the top", 1250, classOf(Payment), new Payment(1250)],
    [
      "in a list",
      [1250, 99],
      listOf(classOf(Payment)),
      [new Payment(1250), new Payment(99)],
    ],
    [
      "in an object, leaving the other properties as they are",
      { paid: 1250, note: "late" },
      objectOf({ paid: classOf(Payment) }),
      { paid: new Payment(1250), note: "late" },
    ],
    [
      "in an optional property",
      { paid: 1250 },
      objectOf({ paid: classOf(Payment).optional() }),
      { paid: new Payment(1250) },
    ],
    [
      "in a nullable property holding a value",
      { paid: 1250 },
      objectOf({ paid: classOf(Payment).nullable() }),
      { paid: new Payment(1250) },
    ],
    [
      "in a nullable property holding null",
      { paid: null },
      objectOf({ paid: classOf(Payment).nullable() }),
      { paid: null },
    ],
  ])(
    "makes an instance with fromValue wherever classOf names a class: %s",
    (_, stored, schema, instance) => {
      expect(received(stored, schema)).toStrictEqual(Some(instance));
    },
  );

  it("leaves an optional property that is missing missing", () => {
    expect(
      received({}, objectOf({ paid: classOf(Payment).optional() })),
    ).toEqual(Some({}));
  });
});
