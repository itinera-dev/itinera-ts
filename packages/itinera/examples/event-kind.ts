import assert from "node:assert/strict";
import { type EmittedKind, type Event, EventKind } from "itinera/event";

export function isLast(event: Event): boolean {
  return (
    event.kind === EventKind.JourneySucceeded ||
    event.kind === EventKind.JourneyFailed ||
    event.kind === EventKind.JourneyAborted
  );
}

function fromAStep(kind: EmittedKind): boolean {
  return kind.startsWith("step_");
}

assert.equal(EventKind.JourneyAborted, "journey_aborted");
assert.ok(EventKind.has("step_failed"));
assert.ok(!EventKind.has("step_started"));
assert.equal(EventKind.values.length, 29);
assert.ok(fromAStep(EventKind.StepWarning));
