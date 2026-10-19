import { describe, expect, it } from "vitest";
import type { Event } from "../event.js";
import { journeyAborted, journeyStarted } from "../event/fixtures.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { FailingOn, FailingOnGlobalMetadata } from "./fixtures.js";
import { Failures, Guard } from "./guard.js";

function kinds(recorder: RecordingReporter): string[] {
  return recorder.events.map((event) => event.kind);
}

describe("Guard", () => {
  it("delivers every event to its reporter while no reporter has failed", async () => {
    const recorder = new RecordingReporter();
    const guard = new Guard(recorder, new Failures());
    await guard.report(journeyStarted());
    await guard.report(journeyAborted());
    expect(kinds(recorder)).toEqual(["journey_started", "journey_aborted"]);
  });

  it("passes on the failure of its reporter and records it as the first", async () => {
    const failures = new Failures();
    const guard = new Guard(
      new FailingOn("journey_started", "disk full"),
      failures,
    );
    await expect(guard.report(journeyStarted())).rejects.toThrow("disk full");
    expect(failures.first?.error).toEqual(new Error("disk full"));
  });

  it("keeps the first failure when another reporter fails after it", async () => {
    const failures = new Failures();
    failures.record("first");
    const guard = new Guard(
      new FailingOn("journey_started", "second"),
      failures,
    );
    await guard.report(journeyStarted());
    expect(failures.first?.error).toBe("first");
  });

  it("delivers only journey_aborted once another reporter has failed", async () => {
    const failures = new Failures();
    failures.record(new Error("disk full"));
    const recorder = new RecordingReporter();
    const guard = new Guard(recorder, failures);
    await guard.report(journeyStarted());
    await guard.report(journeyAborted());
    expect(kinds(recorder)).toEqual(["journey_aborted"]);
  });

  it("delivers nothing more to a reporter that failed, journey_aborted included", async () => {
    const reporter = new FailingOn("journey_started", "disk full");
    const guard = new Guard(reporter, new Failures());
    await guard.report(journeyStarted()).catch(String);
    await guard.report(journeyAborted());
    expect(reporter.received.map((event: Event) => event.kind)).toEqual([
      "journey_started",
    ]);
  });

  it("ignores a failure on journey_aborted", async () => {
    const failures = new Failures();
    const guard = new Guard(
      new FailingOn("journey_aborted", "disk full"),
      failures,
    );
    await guard.report(journeyAborted());
    expect(failures.first).toBeUndefined();
  });

  it("passes global metadata to its reporter while no reporter has failed", async () => {
    const recorder = new RecordingReporter();
    await new Guard(recorder, new Failures()).receiveGlobalMetadata(
      "tenant",
      "acme",
    );
    expect([...recorder.globalMetadata]).toEqual([["tenant", "acme"]]);
  });

  it("passes on and records the failure of its reporter on global metadata", async () => {
    const failures = new Failures();
    const guard = new Guard(new FailingOnGlobalMetadata("disk full"), failures);
    await expect(guard.receiveGlobalMetadata("tenant", "acme")).rejects.toThrow(
      "disk full",
    );
    expect(failures.first?.error).toEqual(new Error("disk full"));
  });

  it("passes no global metadata once a reporter has failed", async () => {
    const failures = new Failures();
    failures.record(new Error("disk full"));
    const recorder = new RecordingReporter();
    await new Guard(recorder, failures).receiveGlobalMetadata("tenant", "acme");
    expect(recorder.globalMetadata.size).toBe(0);
  });
});
