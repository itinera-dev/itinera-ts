import assert from "node:assert/strict";
import { Ending } from "itinera/unstable";

assert.deepEqual(Ending.outcome(Ending.success), { kind: "success" });

const crashed = Ending.abnormalTermination("gateway down");
assert.equal(crashed.kind, "abnormal termination");
assert.throws(() => Ending.outcome(crashed), { message: "gateway down" });
