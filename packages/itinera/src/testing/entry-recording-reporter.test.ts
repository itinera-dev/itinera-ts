import { describe, expect, it } from "vitest";
import { journeyStarted, stepSucceeded } from "../event/fixtures.js";
import { None, Some } from "../option.js";
import { EntryRecordingReporter } from "./entry-recording-reporter.js";

describe("EntryRecordingReporter", () => {
  it("keeps every entry in order, each with the kind of the event received last before it", () => {
    const recorder = new EntryRecordingReporter();
    recorder.receiveGlobalMetadata("journey_id", "journey-1");
    recorder.report(journeyStarted());
    recorder.receiveGlobalMetadata("tenant", "acme");
    recorder.report(stepSucceeded());
    recorder.receiveGlobalMetadata("tenant", "globex");
    expect(recorder.entries).toEqual([
      { key: "journey_id", value: "journey-1", after: None },
      { key: "tenant", value: "acme", after: Some("journey_started") },
      { key: "tenant", value: "globex", after: Some("step_succeeded") },
    ]);
  });

  it("keeps what a recording reporter keeps too", () => {
    const recorder = new EntryRecordingReporter();
    recorder.report(journeyStarted());
    recorder.receiveGlobalMetadata("tenant", "acme");
    recorder.receiveGlobalMetadata("tenant", "globex");
    expect(recorder.events).toHaveLength(1);
    expect([...recorder.globalMetadata]).toEqual([["tenant", "globex"]]);
  });

  it("gives a copy of its entries, so changing what was read changes nothing it keeps", () => {
    const recorder = new EntryRecordingReporter();
    recorder.receiveGlobalMetadata("tenant", "acme");
    (recorder.entries as unknown[]).length = 0;
    expect(recorder.entries).toHaveLength(1);
  });
});
