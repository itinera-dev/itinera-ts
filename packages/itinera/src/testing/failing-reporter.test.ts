import { describe, expect, it } from "vitest";
import { journeyStarted, stepSucceeded } from "../event/fixtures.js";
import { FailingReporter, type ReporterFailure } from "./failing-reporter.js";

type Receive = (reporter: FailingReporter) => void;

function receivingStarted(reporter: FailingReporter): void {
  reporter.report(journeyStarted());
}

function receivingASuccess(reporter: FailingReporter): void {
  reporter.report(journeyStarted());
  reporter.report(stepSucceeded());
}

function receivingTheTenant(reporter: FailingReporter): void {
  reporter.receiveGlobalMetadata("tenant", "acme");
}

describe("FailingReporter", () => {
  it.each<[string, ReporterFailure, Receive, string]>([
    [
      "on the first event",
      { kind: "first event" },
      receivingStarted,
      "the reporter fails on journey_started",
    ],
    [
      "on an event of a kind",
      { kind: "on event", event: "step_succeeded", message: "disk full" },
      receivingASuccess,
      "disk full",
    ],
    [
      "on an entry of global metadata",
      { kind: "on global metadata", key: "tenant" },
      receivingTheTenant,
      "the reporter fails on the global metadata tenant",
    ],
  ])(
    "fails %s, with its message or one of its own, and remembers it",
    (_, failure, receive, message) => {
      const reporter = new FailingReporter(failure);
      expect(() => {
        receive(reporter);
      }).toThrow(message);
      expect(reporter.failed).toBe(true);
    },
  );

  it("keeps the event and the entry it fails on", () => {
    const reporter = new FailingReporter(
      { kind: "first event" },
      { kind: "on global metadata", key: "tenant" },
    );
    expect(() => {
      receivingStarted(reporter);
    }).toThrow();
    expect(() => {
      receivingTheTenant(reporter);
    }).toThrow();
    expect(reporter.events).toEqual([journeyStarted()]);
    expect(reporter.globalMetadata.get("tenant")).toBe("acme");
  });

  it("never fails when given no failure", () => {
    const reporter = new FailingReporter();
    receivingASuccess(reporter);
    receivingTheTenant(reporter);
    expect(reporter.failed).toBe(false);
  });
});
