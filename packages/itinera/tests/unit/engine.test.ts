import { describe, expect, it } from "vitest";
import { charging, orders, run, failingOn } from "../fixtures/engine.js";
import { Step } from "../../src/step.js";
import { Ending } from "../../src/testing/ending.js";
import { RecordingReporter } from "../../src/testing/recording-reporter.js";
import { stepMock } from "../../src/testing/step-mock.js";

class Crashing extends Step {
  override run(): never {
    throw new TypeError("gateway down");
  }
}

describe("runJourney", () => {
  it("emits no event and sets no global metadata for an instance it refuses", async () => {
    const recorder = new RecordingReporter();
    await run(charging({ order: Number.NaN }, { reporters: [recorder] })).catch(
      String,
    );
    expect(recorder.events).toEqual([]);
    expect(recorder.globalMetadata.size).toBe(0);
  });

  it("gives the journey ID of the instance", async () => {
    const instance = charging();
    expect((await run(instance)).journeyId).toBe(instance.journeyId);
  });

  it("gives a journey that succeeded its data bag", async () => {
    const result = await run(charging({ order: "A-1", shop: "corner" }));
    expect(result.status.kind).toBe("succeeded");
    expect(result.isSucceeded() && result.status.dataBag.keys()).toEqual([
      "order",
      "shop",
    ]);
  });

  it("gives a journey that failed its failure, with the error as thrown, and its data bag", async () => {
    const result = await run(
      orders(Crashing.builder("charge")).instance({ order: "A-1" }),
    );
    expect(result.failure).toEqual({
      cause: "abnormal termination",
      error: new TypeError("gateway down"),
      errorMessage: "gateway down",
    });
    expect(result.isFailed() && result.status.dataBag.keys()).toEqual([
      "order",
    ]);
  });

  it("gives a journey that was aborted its abort, with the error as thrown, and no data bag", async () => {
    const result = await run(
      orders(
        stepMock({
          attempts: [Ending.success],
          buildFailure: "no connection",
        }).builder("charge"),
      ).instance(),
    );
    expect(result.status).toEqual({
      kind: "aborted",
      abort: {
        reason: "step could not be built",
        step: "charge",
        source: { kind: "step" },
        errorMessage: "no connection",
        error: new Error("no connection"),
      },
    });
  });

  it("aborts the journey when a reporter fails, and delivers journey_aborted to the others only", async () => {
    const failing = failingOn("attempt_started", "disk full");
    const recorder = new RecordingReporter();
    const result = await run(charging({}, { reporters: [failing, recorder] }));
    expect(result.abort).toMatchObject({
      reason: "reporter failed",
      step: "charge",
      errorMessage: "disk full",
    });
    expect(failing.events.map((event) => event.kind)).toEqual([
      "journey_started",
      "attempt_started",
    ]);
    expect(recorder.events.map((event) => event.kind)).toEqual([
      "journey_started",
      "journey_aborted",
    ]);
  });

  it("aborts the journey when a reporter fails on its last event", async () => {
    const result = await run(
      charging(
        {},
        {
          reporters: [failingOn("journey_succeeded", "disk full")],
        },
      ),
    );
    expect(result.abort).toEqual({
      reason: "reporter failed",
      errorMessage: "disk full",
      error: new Error("disk full"),
    });
  });
});
