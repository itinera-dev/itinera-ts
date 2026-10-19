import { describe, expect, it } from "vitest";
import type { Dispatcher, Reporter } from "../report.js";
import { DefaultDispatcher } from "../report/default-dispatcher.js";
import type { StepName } from "../step.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { FailingOn, journeyThrough, Swallowing } from "./fixtures.js";
import { Failures, Guard } from "./guard.js";
import { JourneyAbortError } from "./signal.js";

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
        new FailingOn("journey_started", "disk full"),
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
        new FailingOn("journey_started", "disk full"),
      ),
      failures,
    );
    await expect(journey.emit(started)).rejects.toBeInstanceOf(
      JourneyAbortError,
    );
    expect(journey.recorded).toMatchObject({ errorMessage: "disk full" });
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
    dispatcher.add(new FailingOn("journey_aborted", "disk full"));
    await expect(
      journeyThrough(dispatcher).deliverAborted({
        reason: "reporter failed",
        errorMessage: "x",
        error: "x",
      }),
    ).resolves.toBeUndefined();
  });
});
