import { describe, expect, it } from "vitest";
import type { Reporter } from "../report.js";
import { DefaultDispatcher } from "../report/default-dispatcher.js";
import { Attempt, type StepName } from "../step.js";
import { RecordingReporter } from "../testing/recording-reporter.js";
import { FailingOn, journeyThrough } from "./fixtures.js";
import { Failures, Guard } from "./guard.js";
import { AttemptHandles } from "./handles.js";
import type { Journey } from "./journey.js";
import { JourneyAbortError } from "./signal.js";

const charge = "charge" as StepName;

const notAValue = Number.NaN;

interface Lent {
  readonly handles: AttemptHandles;
  readonly journey: Journey;
  readonly recorder: RecordingReporter;
}

/** The handles of attempt 1 of `charge`, delivering to a recorder, then to `others`. */
function lent(...others: readonly Reporter[]): Lent {
  const failures = new Failures();
  const dispatcher = new DefaultDispatcher();
  const recorder = new RecordingReporter();
  for (const reporter of [recorder, ...others]) {
    dispatcher.add(new Guard(reporter, failures));
  }
  const journey = journeyThrough(dispatcher, failures);
  journey.step = charge;
  const handles = new AttemptHandles(journey, {
    kind: "step",
    step: charge,
    attempt: Attempt.first,
  });
  return { handles, journey, recorder };
}

function kindsOf(recorder: RecordingReporter): readonly string[] {
  return recorder.events.map((event) => event.kind);
}

describe("the contributor of an attempt", () => {
  it("keeps the last value contributed under a key, in the order keys were first contributed", () => {
    const { handles } = lent();
    handles.contributor.contribute("receipt", "R-1");
    handles.contributor.contribute("paid", true);
    handles.contributor.contribute("receipt", "R-2");
    expect([...handles.contributed]).toEqual([
      ["receipt", "R-2"],
      ["paid", true],
    ]);
  });

  it("captures a value when it is contributed", () => {
    const { handles } = lent();
    const receipt = { number: "R-1" };
    handles.contributor.contribute("receipt", receipt);
    receipt.number = "R-2";
    expect(handles.contributed.get("receipt")).toEqual({ number: "R-1" });
  });

  it("ends the step with the executor's signal on a contribution that is not a value, and aborts the journey", async () => {
    const { handles, journey } = lent();
    expect(() => {
      handles.contributor.contribute("total", notAValue);
    }).toThrow(JourneyAbortError);
    await handles.closed();
    expect([journey.recorded, handles.contributed.size]).toEqual([
      { reason: "not a value", step: "charge", key: "total" },
      0,
    ]);
  });
});

describe("the step reporter of an attempt", () => {
  it("emits the step's events, with their data captured, and sets global metadata before reporting it", async () => {
    const { handles, recorder } = lent();
    const data = { carrier: "post" };
    const shipped = handles.reporter.info("handed over", data);
    data.carrier = "courier";
    await shipped;
    await handles.reporter.warning("late");
    await handles.reporter.error("lost", 3);
    await handles.reporter.setGlobalMetadata("carrier", "post");
    expect(recorder.events).toMatchObject([
      {
        kind: "step_info",
        step: "charge",
        attempt: Attempt.first,
        message: "handed over",
        data: { carrier: "post" },
      },
      { kind: "step_warning", message: "late" },
      { kind: "step_error", message: "lost", data: 3 },
      {
        kind: "global_metadata_set",
        key: "carrier",
        source: { kind: "step", step: "charge", attempt: Attempt.first },
      },
    ]);
    expect(recorder.events[1]).not.toHaveProperty("data");
    expect(recorder.globalMetadata.get("carrier")).toBe("post");
  });

  it("delivers calls the step does not await in the order it made them", async () => {
    const { handles, recorder } = lent();
    void handles.reporter.info("first");
    void handles.reporter.setGlobalMetadata("tenant", "acme");
    void handles.reporter.info("second");
    await handles.closed();
    expect(kindsOf(recorder)).toEqual([
      "step_info",
      "global_metadata_set",
      "step_info",
    ]);
  });

  it.each([
    [
      "event data that is not a value",
      (handles: AttemptHandles) => handles.reporter.info("charged", notAValue),
      { reason: "not a value", step: "charge", eventKind: "step_info" },
    ],
    [
      "global metadata that is not a value",
      (handles: AttemptHandles) =>
        handles.reporter.setGlobalMetadata("total", notAValue),
      { reason: "not a value", step: "charge", key: "total" },
    ],
    [
      "global metadata under journey_id",
      (handles: AttemptHandles) =>
        handles.reporter.setGlobalMetadata("journey_id", "other"),
      {
        reason: "reserved metadata key",
        step: "charge",
        key: "journey_id",
        source: { kind: "step" },
      },
    ],
  ])(
    "rejects the call with the executor's signal, aborting the journey and delivering nothing, on %s",
    async (_, call, abort) => {
      const { handles, journey, recorder } = lent();
      await expect(call(handles)).rejects.toBeInstanceOf(JourneyAbortError);
      expect([
        journey.recorded,
        recorder.events,
        [...recorder.globalMetadata],
      ]).toEqual([abort, [], []]);
    },
  );

  it("rejects the emit a reporter fails on, and delivers nothing the step emits afterwards", async () => {
    const { handles, journey, recorder } = lent(
      new FailingOn("step_info", "disk full"),
    );
    const failed = handles.reporter.info("charged");
    const later = handles.reporter.warning("late");
    await expect(failed).rejects.toBeInstanceOf(JourneyAbortError);
    await expect(later).rejects.toBeInstanceOf(JourneyAbortError);
    expect([journey.recorded?.reason, kindsOf(recorder)]).toEqual([
      "reporter failed",
      ["step_info"],
    ]);
  });

  it("delivers what the step emitted before a contribution that is not a value, and nothing after it", async () => {
    const { handles, recorder } = lent();
    void handles.reporter.info("before");
    expect(() => {
      handles.contributor.contribute("total", notAValue);
    }).toThrow(JourneyAbortError);
    void handles.reporter.info("after");
    await handles.closed();
    expect(recorder.events).toMatchObject([{ message: "before" }]);
  });

  it("leaves no rejection unhandled when the step does not await a call that fails", async () => {
    const { handles, journey } = lent();
    void handles.reporter.info("charged", notAValue);
    await handles.closed();
    expect(journey.recorded?.reason).toBe("not a value");
  });
});

describe("closed handles", () => {
  it.each<[string, (handles: AttemptHandles) => unknown, string]>([
    [
      "contributing",
      (handles: AttemptHandles) => {
        handles.contributor.contribute("stale", 1);
      },
      "contributor",
    ],
    [
      "emitting",
      (handles: AttemptHandles) => handles.reporter.info("stale"),
      "step reporter",
    ],
    [
      "setting global metadata",
      (handles: AttemptHandles) =>
        handles.reporter.setGlobalMetadata("stale", 1),
      "step reporter",
    ],
  ])(
    "throw where they are used, %s, and change nothing",
    async (_, use, handle) => {
      const { handles, journey, recorder } = lent();
      await handles.closed();
      await handles.closed();
      expect(() => use(handles)).toThrow(
        new Error(
          `the ${handle} of attempt 1 of step charge was used after the attempt ended`,
        ),
      );
      await handles.closed();
      expect([
        handles.contributed.size,
        recorder.events,
        journey.recorded,
      ]).toEqual([0, [], undefined]);
    },
  );
});
