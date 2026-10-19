import {
  type Event,
  type JourneyId,
  RecordingReporter,
  type Timestamp,
  type WorkflowName,
} from "itinera/unstable";
import { describe, expect, it } from "vitest";
import type { Holding } from "./model.js";
import { RecordingDispatcherFactory } from "./record.js";

const started = {
  kind: "journey_started",
  sequence: 1,
  timestamp: "2026-10-19T12:00:00.000Z" as Timestamp,
  journeyId: "journey-1" as JourneyId,
  workflow: "orders" as WorkflowName,
  initialKeys: [],
} satisfies Event;

const succeeded = {
  ...started,
  kind: "journey_succeeded",
  sequence: 2,
  decidedBy: "default",
} satisfies Event;

function holding(holding: Holding) {
  const held = new RecordingReporter();
  const added = new RecordingReporter();
  const factory = new RecordingDispatcherFactory(held, {
    kind: "makes",
    holding,
  });
  return { held, added, dispatcher: factory.create() };
}

describe("the recording dispatcher factory", () => {
  it("makes dispatchers that deliver to the reporter it holds, then to those added", async () => {
    const { held, added, dispatcher } = holding({ kind: "adds reporters" });
    await dispatcher.add(added);
    await dispatcher.setGlobalMetadata("tenant", "acme");
    await dispatcher.dispatch(started);
    expect(held.events).toEqual([started]);
    expect(added.events).toEqual([started]);
    expect([...added.globalMetadata]).toEqual([["tenant", "acme"]]);
  });

  it("fails to make a dispatcher when the scenario says so", () => {
    const factory = new RecordingDispatcherFactory(new RecordingReporter(), {
      kind: "fails",
    });
    expect(() => factory.create()).toThrow(
      "the scripted dispatcher factory fails",
    );
  });

  it("makes dispatchers that ignore added reporters when the scenario says so", async () => {
    const { held, added, dispatcher } = holding({
      kind: "ignores added reporters",
    });
    await dispatcher.add(added);
    await dispatcher.dispatch(started);
    expect(held.events).toEqual([started]);
    expect(added.events).toEqual([]);
  });

  it("makes dispatchers that fail when a reporter is added when the scenario says so", () => {
    const { added, dispatcher } = holding({ kind: "fails when adding" });
    expect(() => dispatcher.add(added)).toThrow(
      "the scripted dispatcher fails when a reporter is added",
    );
  });

  it("makes dispatchers that fail on one kind of event and deliver every other", async () => {
    const { held, dispatcher } = holding({
      kind: "fails dispatching",
      event: "journey_succeeded",
    });
    await dispatcher.dispatch(started);
    expect(() => dispatcher.dispatch(succeeded)).toThrow(
      "the scripted dispatcher fails when dispatching journey_succeeded",
    );
    expect(held.events).toEqual([started]);
  });
});
