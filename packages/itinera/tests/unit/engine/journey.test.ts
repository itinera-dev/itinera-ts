import { describe, expect, it } from "vitest";
import type { Dispatcher, Reporter } from "../../../src/report.js";
import { DefaultDispatcher } from "../../../src/report/default-dispatcher.js";
import type { StepName } from "../../../src/step.js";
import { FailingReporter } from "../../../src/testing/failing-reporter.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import {
  journeyThrough,
  Swallowing,
  failingOn,
} from "../../fixtures/engine.js";
import { Failures, Guard } from "../../../src/engine/guard.js";
import { JourneyAbortError } from "../../../src/engine/signal.js";

function guarded<D extends DefaultDispatcher | Swallowing>(
  dispatcher: D,
  failures: Failures,
  reporter: Reporter,
): D {
  dispatcher.add(new Guard(reporter, failures));
  return dispatcher;
}

const started = { kind: "journey_started", initialKeys: [] } as const;

describe("Journey.emit", () => {
  it("aborts the journey with reporter failed, naming the step being run, when a reporter fails", async () => {
    const failures = new Failures();
    const journey = journeyThrough(
      guarded(
        new DefaultDispatcher(),
        failures,
        failingOn("journey_started", "disk full"),
      ),
      failures,
    );
    journey.step = "charge" as StepName;
    await expect(journey.emit(started)).rejects.toBeInstanceOf(
      JourneyAbortError,
    );
    expect(journey.recorded).toEqual({
      reason: "reporter failed",
      step: "charge",
      errorMessage: "disk full",
      error: new Error("disk full"),
    });
  });

  it("aborts the journey when the dispatcher fails on its own", async () => {
    const dispatcher: Dispatcher = {
      add: () => undefined,
      dispatch: () => {
        throw new Error("queue closed");
      },
      setGlobalMetadata: () => undefined,
    };
    const journey = journeyThrough(dispatcher);
    await expect(journey.emit(started)).rejects.toBeInstanceOf(
      JourneyAbortError,
    );
    expect(journey.recorded).toMatchObject({
      reason: "reporter failed",
      errorMessage: "queue closed",
    });
  });

  it("aborts the journey when the dispatcher swallows the failure of a reporter", async () => {
    const failures = new Failures();
    const journey = journeyThrough(
      guarded(
        new Swallowing(),
        failures,
        failingOn("journey_started", "disk full"),
      ),
      failures,
    );
    await expect(journey.emit(started)).rejects.toBeInstanceOf(
      JourneyAbortError,
    );
    expect(journey.recorded).toMatchObject({ errorMessage: "disk full" });
  });
});

describe("Journey.setGlobalMetadata", () => {
  it("passes the entry on to the reporters", async () => {
    const recorder = new RecordingReporter();
    const journey = journeyThrough(
      guarded(new DefaultDispatcher(), new Failures(), recorder),
    );
    await journey.setGlobalMetadata("tenant", "acme");
    expect([...recorder.globalMetadata]).toEqual([["tenant", "acme"]]);
  });

  it("aborts the journey with reporter failed when a reporter fails on the entry", async () => {
    const failures = new Failures();
    const journey = journeyThrough(
      guarded(
        new Swallowing(),
        failures,
        new FailingReporter({
          kind: "on global metadata",
          key: "tenant",
          message: "disk full",
        }),
      ),
      failures,
    );
    await expect(
      journey.setGlobalMetadata("tenant", "acme"),
    ).rejects.toBeInstanceOf(JourneyAbortError);
    expect(journey.recorded).toMatchObject({
      reason: "reporter failed",
      errorMessage: "disk full",
    });
  });
});

describe("Journey.commit", () => {
  it("sets the key in the data bag, and says whether it replaced a value", () => {
    const journey = journeyThrough(new DefaultDispatcher());
    expect([
      journey.commit("receipt", "R-1"),
      journey.commit("receipt", "R-2"),
      [...journey.data],
    ]).toEqual([false, true, [["receipt", "R-2"]]]);
  });
});

describe("Journey.abort", () => {
  it("keeps the first abort recorded", () => {
    const journey = journeyThrough(new DefaultDispatcher());
    journey.abort({
      reason: "reporter failed",
      errorMessage: "first",
      error: "first",
    });
    const signal = journey.abort({
      reason: "reporter failed",
      errorMessage: "second",
      error: "second",
    });
    expect(signal.abort).toMatchObject({ errorMessage: "first" });
  });
});

describe("Journey.deliverAborted", () => {
  it("delivers journey_aborted without the error itself", async () => {
    const recorder = new RecordingReporter();
    const dispatcher = new DefaultDispatcher();
    dispatcher.add(recorder);
    await journeyThrough(dispatcher).deliverAborted({
      reason: "reporter failed",
      errorMessage: "disk full",
      error: new Error("disk full"),
    });
    expect(recorder.events).toMatchObject([
      {
        kind: "journey_aborted",
        abort: { reason: "reporter failed", errorMessage: "disk full" },
      },
    ]);
    expect(recorder.events[0]).not.toHaveProperty("abort.error");
  });

  it("ignores a failure while journey_aborted is delivered", async () => {
    const dispatcher = new DefaultDispatcher();
    dispatcher.add(failingOn("journey_aborted", "disk full"));
    await expect(
      journeyThrough(dispatcher).deliverAborted({
        reason: "reporter failed",
        errorMessage: "x",
        error: "x",
      }),
    ).resolves.toBeUndefined();
  });
});
