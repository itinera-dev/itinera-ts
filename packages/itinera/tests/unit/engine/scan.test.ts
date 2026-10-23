import { describe, expect, it } from "vitest";
import { Ending } from "../../../src/testing/ending.js";
import { RecordingReporter } from "../../../src/testing/recording-reporter.js";
import { stepMock } from "../../../src/testing/step-mock.js";
import { charge, noon, orders, recorded, run } from "../../fixtures/engine.js";

async function pathOf(
  workflow: ReturnType<typeof orders>,
): Promise<readonly string[]> {
  return (await recorded(workflow)).path;
}

describe("travel", () => {
  it("starts the journey with its initial keys, runs its one step and succeeds", async () => {
    const recorder = new RecordingReporter();
    const instance = orders(charge()).instance(
      { order: "A-1" },
      { reporters: [recorder] },
    );
    await run(instance);
    const fixed = {
      timestamp: noon,
      journeyId: instance.journeyId,
      workflow: "orders",
    };
    expect(recorder.events).toEqual([
      {
        kind: "journey_started",
        sequence: 1,
        ...fixed,
        initialKeys: ["order"],
      },
      {
        kind: "attempt_started",
        sequence: 2,
        ...fixed,
        step: "charge",
        attempt: { number: 1 },
      },
      {
        kind: "step_succeeded",
        sequence: 3,
        ...fixed,
        step: "charge",
        attempt: { number: 1 },
      },
      {
        kind: "journey_succeeded",
        sequence: 4,
        ...fixed,
        decidedBy: "default",
      },
    ]);
  });

  it("runs the steps in their order", async () => {
    const ship = stepMock({ attempts: [Ending.success] });
    expect(await pathOf(orders(charge(), ship.builder("ship")))).toEqual([
      "charge attempt 1 succeeded",
      "ship attempt 1 succeeded",
      "journey succeeded",
    ]);
  });

  it("carries the step, the cause and the error's message on journey_failed", async () => {
    const crashing = stepMock({
      attempts: [Ending.abnormalTermination("timeout")],
    });
    const { events } = await recorded(orders(crashing.builder("charge")));
    expect(events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "abnormal termination",
      errorMessage: "timeout",
      decidedBy: "default",
    });
  });

  it("carries the step, the cause and the reason on journey_failed", async () => {
    const declining = stepMock({
      attempts: [Ending.failure({ code: "declined", message: "no funds" })],
    });
    const { events } = await recorded(orders(declining.builder("charge")));
    expect(events.at(-1)).toMatchObject({
      kind: "journey_failed",
      step: "charge",
      cause: "failure",
      reason: { code: "declined", message: "no funds" },
      decidedBy: "default",
    });
    expect(events.at(-1)).not.toHaveProperty("errorMessage");
  });
});
