import type { Event, JourneyId } from "itinera/unstable";
import type { PlainValue } from "itinera/value";
import { describe, expect, it } from "vitest";
import type { ReporterFailure } from "../../src/model/report.js";
import { ModelError } from "../../src/model/error.js";
import { Recorders, ScenarioReporter } from "../../src/recorders.js";
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

/** The reporters of a scenario that scripts no failure. */
function unscripted(): Recorders {
  return new Recorders(new Map());
}

describe("the reporters of a scenario", () => {
  it("gives a sentence the reporters made under a name", () => {
    const recorders = unscripted();
    const made = recorders.make("audit");
    expect(recorders.receivers("audit")).toEqual([made]);
  });

  it("makes a listed reporter with the journey ID it is given, and keeps it under its name", () => {
    const recorders = unscripted();
    const made = recorders.makerOf("audit")("order-7" as JourneyId);
    expect(made.madeWith).toBe("order-7");
    expect(recorders.receivers("audit")).toEqual([made]);
  });

  it("refuses a sentence reading a reporter no journey had, as an error in the case", () => {
    expect(() => unscripted().receivers("audit")).toThrow(
      new ModelError('no reporter "audit" was made'),
    );
  });
});
