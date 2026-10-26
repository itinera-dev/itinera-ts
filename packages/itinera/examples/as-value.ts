import assert from "node:assert/strict";
import type { AsValue } from "itinera/value";

interface Order {
  id: string;
  coupon?: string;
}

function keep<T>(value: T & AsValue<T>): T {
  return value;
}

const order: Order = { id: "R-1" };

assert.equal(keep(order), order);
// @ts-expect-error: a function is not a value
keep({ id: "R-1", total: () => 1250 });
