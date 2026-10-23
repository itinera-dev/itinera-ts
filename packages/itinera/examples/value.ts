import assert from "node:assert/strict";
import type { PlainValue, Value } from "itinera/unstable";

class Payment {
  constructor(readonly cents: number) {}

  toValue(): PlainValue {
    return { cents: this.cents };
  }
}

function kind(value: Value): string {
  return Array.isArray(value) ? "list" : typeof value;
}

assert.equal(kind(1250), "number");
assert.equal(kind(["tea", new Payment(1250)]), "list");
assert.equal(kind({ order: "R-1", payment: new Payment(1250) }), "object");
// @ts-expect-error: a Date is not a value
kind(new Date());
