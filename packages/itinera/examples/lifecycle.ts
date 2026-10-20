import assert from "node:assert/strict";
import type { Lifecycle } from "itinera/policy";

function ends(lifecycle: Lifecycle | undefined): string {
  switch (lifecycle?.kind) {
    case undefined:
      return "kept the default";
    case "FinishWorkflow":
      return "finished the journey";
    case "FailWorkflow":
      return `failed the journey: ${lifecycle.reason.code}`;
  }
}

assert.equal(ends(undefined), "kept the default");
assert.equal(ends({ kind: "FinishWorkflow" }), "finished the journey");
assert.equal(
  ends({ kind: "FailWorkflow", reason: { code: "fraud" } }),
  "failed the journey: fraud",
);
