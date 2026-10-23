import assert from "node:assert/strict";
import type { PlainValue } from "itinera/value";

const order: PlainValue = {
  id: "R-1",
  lines: [{ sku: "tea", quantity: 2 }],
  coupon: null,
};

assert.deepEqual(JSON.parse(JSON.stringify(order)), order);
