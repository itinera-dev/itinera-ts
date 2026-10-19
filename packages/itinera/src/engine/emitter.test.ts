import { describe, expect, it } from "vitest";
import type { JourneyId } from "../journey.js";
import type { WorkflowName } from "../workflow.js";
import { Emitter } from "./emitter.js";

function emitter(): Emitter {
  return new Emitter(
    "journey-1" as JourneyId,
    "orders" as WorkflowName,
    () => new Date("2026-10-19T12:00:00.000Z"),
  );
}

describe("Emitter", () => {
  it("numbers the events of a journey from 1, in the order they are made", () => {
    const made = emitter();
    made.next({ kind: "journey_started", initialKeys: [] });
    expect(
      made.next({ kind: "journey_succeeded", decidedBy: "default" }),
    ).toMatchObject({
      sequence: 2,
    });
  });

  it("gives each event the time, the journey ID and the workflow", () => {
    expect(
      emitter().next({ kind: "journey_started", initialKeys: [] }),
    ).toEqual({
      kind: "journey_started",
      initialKeys: [],
      sequence: 1,
      timestamp: "2026-10-19T12:00:00.000Z",
      journeyId: "journey-1",
      workflow: "orders",
    });
  });

  it("freezes each event and everything it carries", () => {
    const event = emitter().next({
      kind: "journey_started",
      initialKeys: ["order"],
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(
      event.kind === "journey_started" && Object.isFrozen(event.initialKeys),
    ).toBe(true);
  });
});
