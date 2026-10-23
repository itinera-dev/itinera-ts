import assert from "node:assert/strict";
import { None, type Option, Some } from "itinera/option";

function coupon(present: boolean): Option<string> {
  return present ? Some("WELCOME") : None;
}

assert.equal(coupon(true).unwrapOr("none"), "WELCOME");
assert.equal(coupon(false).unwrapOr("none"), "none");
