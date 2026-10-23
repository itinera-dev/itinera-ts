import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import type { PlainValue } from "../../../src/value.js";
import {
  boolean,
  classCarriedBy,
  classOf,
  guard,
  integer,
  list,
  listOf,
  number,
  object,
  objectOf,
  optional,
  string,
  unwrapped,
} from "../../../src/value/token.js";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

function accepts(schema: StandardSchemaV1, value: unknown): boolean {
  const checked = schema["~standard"].validate(value);
  if (checked instanceof Promise) {
    throw new Error("the check is asynchronous");
  }
  return checked.issues === undefined;
}

function isCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

describe("the tokens", () => {
  it.each([
    ["string, a string", string, "tea", true],
    ["string, a number", string, 1, false],
    ["integer, a safe integer", integer, Number.MAX_SAFE_INTEGER, true],
    ["integer, a whole number beyond 2^53 - 1", integer, 2 ** 53, false],
    ["integer, a fraction", integer, 1.5, false],
    ["number, a fraction", number, 1.5, true],
    ["number, a string", number, "1", false],
    ["boolean, false", boolean, false, true],
    ["boolean, null", boolean, null, false],
    ["list, a list of anything", list, [1, "tea", null], true],
    ["list, an object", list, { 0: 1 }, false],
    ["object, an object", object, { tea: 1 }, true],
    ["object, a list", object, [1], false],
    ["object, null", object, null, false],
    ["listOf, a list of its items", listOf(integer), [1, 2], true],
    ["listOf, an item of another type", listOf(integer), [1, "2"], false],
    ["objectOf, its properties", objectOf({ id: string }), { id: "R-1" }, true],
    [
      "objectOf, with others it does not check",
      objectOf({ id: string }),
      { id: "R-1", total: 3 },
      true,
    ],
    [
      "objectOf, a property missing",
      objectOf({ id: string }),
      { total: 3 },
      false,
    ],
    [
      "objectOf, an optional property missing",
      objectOf({ id: string.optional() }),
      {},
      true,
    ],
    ["classOf, any value", classOf(Payment), { cents: "any" }, true],
    ["guard, what it accepts", guard("a currency code", isCode), "EUR", true],
    ["guard, what it refuses", guard("a currency code", isCode), "euro", false],
  ])("check a value as their names say: %s", (_, token, value, accepted) => {
    expect(accepts(token, value)).toBe(accepted);
  });
});

describe("classOf", () => {
  it("carries the class it names", () => {
    expect(classCarriedBy(classOf(Payment))).toBe(Payment);
  });

  it("is carried by no other schema", () => {
    expect(classCarriedBy(string)).toBeUndefined();
  });
});

describe("guard", () => {
  it("keeps its name as the schema's description", () => {
    expect(guard("a currency code", isCode).description).toBe(
      "a currency code",
    );
  });

  it("refuses an empty name", () => {
    expect(() => guard("", isCode)).toThrow("a guard has an empty name");
  });
});

describe("unwrapped", () => {
  it("checks the schema optional wraps, as optional", () => {
    expect(unwrapped(optional(integer))).toEqual({
      schema: integer,
      optional: true,
    });
  });

  it("wraps any other Standard Schema validator", () => {
    const another: StandardSchemaV1<string> = {
      "~standard": {
        version: 1,
        vendor: "another",
        validate: (value) => ({ value: String(value) }),
      },
    };
    expect(unwrapped(optional(another)).schema).toBe(another);
  });

  it("checks any other schema as itself, as required", () => {
    expect(unwrapped(integer)).toEqual({ schema: integer, optional: false });
  });
});

describe("optional", () => {
  it("is not itself a schema", () => {
    expect(optional(integer)).not.toHaveProperty("~standard");
  });
});
