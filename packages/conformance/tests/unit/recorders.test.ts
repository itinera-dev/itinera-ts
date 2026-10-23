import type { Event, PlainValue } from "itinera/unstable";
import { describe, expect, it } from "vitest";
import type { ReporterFailure } from "../../src/model/report.js";
import { ScenarioReporter } from "../../src/recorders.js";
import { attemptStarted, started } from "../fixtures/trace.js";

type Receive = (reporter: ScenarioReporter) => void;

function receivingStarted(reporter: ScenarioReporter): void {
  reporter.report(started);
}

function receivingAnAttempt(reporter: ScenarioReporter): void {
  reporter.report(started);
  reporter.report(attemptStarted("charge"));
}

function receivingTheTenant(reporter: ScenarioReporter): void {
  reporter.receiveGlobalMetadata("tenant", "acme");
}

describe("a scenario's reporter", () => {
  it.each<
    [string, ReporterFailure, Receive, readonly Event[], [string, PlainValue][]]
  >([
    [
      "on the first event",
      { kind: "first event" },
      receivingStarted,
      [started],
      [],
    ],
    [
      "on an event of a kind",
      { kind: "on event", event: "attempt_started" },
      receivingAnAttempt,
      [started, attemptStarted("charge")],
      [],
    ],
    [
      "on an entry of global metadata",
      { kind: "on global metadata", key: "tenant" },
      receivingTheTenant,
      [],
      [["tenant", "acme"]],
    ],
  ])(
    "keeps what it fails on, then fails and remembers it, %s",
    (_, failure, receive, events, globalMetadata) => {
      const reporter = new ScenarioReporter(failure);
      expect(() => {
        receive(reporter);
      }).toThrow(Error);
      expect(reporter.events).toEqual(events);
      expect([...reporter.globalMetadata]).toEqual(globalMetadata);
      expect(reporter.failed).toBe(true);
    },
  );

  it("never fails when the scenario scripts no failure", () => {
    const reporter = new ScenarioReporter(undefined);
    receivingAnAttempt(reporter);
    receivingTheTenant(reporter);
    expect(reporter.failed).toBe(false);
  });

  it("fails with the message the scenario gives", () => {
    const reporter = new ScenarioReporter({
      kind: "on event",
      event: "journey_started",
      message: "disk full",
    });
    expect(() => {
      receivingStarted(reporter);
    }).toThrow("disk full");
  });
});
