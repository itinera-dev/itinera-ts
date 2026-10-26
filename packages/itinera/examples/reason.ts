import assert from "node:assert/strict";
import type { Reason } from "itinera/step";

function explain(reason: Reason): string {
  return reason.message === undefined
    ? reason.code
    : `${reason.code}: ${reason.message}`;
}

assert.equal(explain({ code: "declined" }), "declined");
assert.equal(
  explain({
    code: "declined",
    message: "card expired",
    details: { last4: "4242" },
  }),
  "declined: card expired",
);
