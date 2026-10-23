import type { JourneyId } from "itinera/unstable";
import { describe, expect, it } from "vitest";
import { ModelError } from "../../src/model/error.js";
import { Recorders, ScenarioReporter } from "../../src/recorders.js";
import { attemptStarted, started } from "../fixtures/trace.js";

function receivingAnAttempt(reporter: ScenarioReporter): void {
  reporter.report(started);
  reporter.report(attemptStarted("charge"));
}

function receivingTheTenant(reporter: ScenarioReporter): void {
  reporter.receiveGlobalMetadata("tenant", "acme");
}

describe("a scenario's reporter", () => {
  it("never fails when the scenario scripts no failure", () => {
    const reporter = new ScenarioReporter(undefined);
    receivingAnAttempt(reporter);
    receivingTheTenant(reporter);
    expect(reporter.failed).toBe(false);
  });

  it("fails as the scenario scripts it", () => {
    const reporter = new ScenarioReporter({ kind: "first event" });
    expect(() => {
      reporter.report(started);
    }).toThrow(Error);
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
