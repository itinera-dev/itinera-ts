import assert from "node:assert/strict";
import { Attempt } from "itinera/unstable";

function label(attempt: Attempt): string {
  return attempt.isFirst()
    ? "first try"
    : `retry, attempt ${attempt.toString()}`;
}

assert.equal(label(Attempt.first), "first try");
assert.equal(Attempt.first.number, 1);
assert.equal(JSON.stringify({ attempt: Attempt.first }), '{"attempt":1}');
