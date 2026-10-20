import assert from "node:assert/strict";
import { Ending } from "itinera/testing";

assert.deepEqual(Ending.outcome(Ending.success), { kind: "success" });
assert.deepEqual(Ending.outcome(Ending.failure("declined")), {
  kind: "failure",
  reason: { code: "declined" },
});
assert.deepEqual(Ending.outcome(Ending.skipBecause("nothing to ship")), {
  kind: "skipped",
  reason: { code: "nothing to ship" },
});

const crashed = Ending.abnormalTermination("gateway down");
assert.equal(crashed.kind, "abnormal termination");
assert.throws(() => Ending.outcome(crashed), { message: "gateway down" });
