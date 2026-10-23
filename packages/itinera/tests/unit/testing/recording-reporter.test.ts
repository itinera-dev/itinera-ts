import { describe, expect, it } from "vitest";
import {
  journeyAborted,
  journeyStarted,
  stepSucceeded,
} from "../../fixtures/event.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";

function recorded(): RecordingReporter {
  const recorder = new RecordingReporter();
  recorder.report(journeyStarted());
  recorder.report(stepSucceeded());
  recorder.report(journeyAborted());
  return recorder;
}

describe("RecordingReporter", () => {
  it("keeps every event it receives, in order", () => {
    expect(recorded().events.map((event) => event.kind)).toEqual([
      "journey_started",
      "step_succeeded",
      "journey_aborted",
    ]);
  });

  it("keeps the latest value of each entry, in the order keys were first set", () => {
    const recorder = new RecordingReporter();
    recorder.receiveGlobalMetadata("journey_id", "journey-1");
    recorder.receiveGlobalMetadata("tenant", "acme");
    recorder.receiveGlobalMetadata("journey_id", "journey-2");
    expect([...recorder.globalMetadata]).toEqual([
      ["journey_id", "journey-2"],
      ["tenant", "acme"],
    ]);
  });

  it("lists the flow of the journey as its path", () => {
    expect(recorded().path).toEqual([
      "charge attempt 1 succeeded",
      "journey aborted: reporter failed",
    ]);
  });

  it("gives a copy of its events, so changing what was read changes nothing it keeps", () => {
    const recorder = recorded();
    (recorder.events as unknown[]).length = 0;
    expect(recorder.events).toHaveLength(3);
  });

  it("gives a copy of its global metadata, so changing what was read changes nothing it keeps", () => {
    const recorder = new RecordingReporter();
    recorder.receiveGlobalMetadata("tenant", "acme");
    (recorder.globalMetadata as Map<string, unknown>).clear();
    expect(recorder.globalMetadata.get("tenant")).toBe("acme");
  });

  it("gives a copy of its path, so changing what was read changes nothing it keeps", () => {
    const recorder = recorded();
    (recorder.path as unknown[]).length = 0;
    expect(recorder.path).toHaveLength(2);
  });
});
