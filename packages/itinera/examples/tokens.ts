import assert from "node:assert/strict";
import {
  guard,
  integer,
  list,
  listOf,
  number,
  object,
  objectOf,
  optional,
  type Optional,
  type RequestType,
  string,
} from "itinera/value";

function isCurrency(value: unknown): value is "EUR" | "GBP" {
  return value === "EUR" || value === "GBP";
}

const currency = guard("a currency", isCurrency);
const order = objectOf({
  id: string,
  lines: listOf(objectOf({ sku: string, quantity: integer })),
  note: string.optional(),
});

assert.ok(integer.safeParse(3).success);
assert.ok(!integer.safeParse(2.5).success);
assert.ok(number.safeParse(2.5).success);
assert.ok(list.safeParse(["tea", 1]).success);
assert.ok(!object.safeParse(["tea", 1]).success);
assert.ok(currency.safeParse("EUR").success);
assert.equal(currency.description, "a currency");
assert.ok(
  order.safeParse({ id: "R-1", lines: [{ sku: "tea", quantity: 2 }] }).success,
);

const coupon: Optional<typeof string> = optional(string);
const types: readonly RequestType[] = [integer, coupon, currency];
assert.equal(types.length, 3);
