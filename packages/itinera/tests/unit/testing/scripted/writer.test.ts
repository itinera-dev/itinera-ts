import { describe, expect, it } from "vitest";
import { orders, type Orders } from "../../../fixtures/engine.js";
import { LocalExecutor } from "../../../../src/executor/local.js";
import type { WorkflowInstance } from "../../../../src/instance.js";
import { DefaultDispatcherFactory } from "../../../../src/report/default-dispatcher.js";
import type { StepBuilder, StepClass } from "../../../../src/step.js";
import { MistakeKind, TestMistake } from "../../../../src/testing/mistake.js";
import { RecordingReporter } from "../../../../src/testing/recording-reporter.js";
import { scripted } from "../../../../src/testing/scripted.js";
import { charge, rescued, shop } from "../../../fixtures/testing/scripted.js";

/**
 * An instance of the workflow `orders` of `steps`, and the recording
 * reporter its journey reports to.
 */
function recorded(
  ...steps: readonly StepBuilder<StepClass>[]
): [WorkflowInstance<Orders>, RecordingReporter] {
  const recorder = new RecordingReporter();
  return [orders(...steps).instance({}, { reporters: [recorder] }), recorder];
}

describe("Writer", () => {
  it.each([
    ["first", () => scripted(shop()).step("chrage")],
    [
      "next",
      () => scripted(shop()).step("charge").willSucceed().andStep("chrage"),
    ],
  ])(
    "throws a test mistake for a %s step the workflow does not have",
    (_, writing) => {
      expect(writing).toThrow(
        new TestMistake([{ kind: MistakeKind.UnknownStep, step: "chrage" }]),
      );
    },
  );

  it("throws a test mistake for a step named twice", () => {
    expect(() =>
      scripted(shop()).step("charge").willSucceed().andStep("charge"),
    ).toThrow(
      new TestMistake([
        { kind: MistakeKind.StepScriptedTwice, step: "charge" },
      ]),
    );
  });

  it("rejects with a test mistake listing everything left out, before any event", async () => {
    const [instance, recorder] = recorded(
      charge().retryBudget(1),
      rescued("pack"),
    );
    const run = scripted(instance)
      .step("charge")
      .willFail("declined")
      .andStep("pack")
      .willFail("torn")
      .ensureAllScripted()
      .run();
    await expect(run).rejects.toThrow(
      new TestMistake([
        { kind: MistakeKind.AttemptLeftOut, step: "charge", attempt: 2 },
        { kind: MistakeKind.AttemptLeftOut, step: "pack", attempt: 2 },
        {
          kind: MistakeKind.RescueStepLeftOut,
          step: "pack_rescue",
          rescued: "pack",
        },
      ]),
    );
    expect(recorder.events).toEqual([]);
  });

  it("runs the journey, with a scripted ending's consequences, and the steps not named for real", async () => {
    const [instance, recorder] = recorded(charge().retryBudget(1));
    const run = await scripted(instance)
      .step("charge")
      .willTerminateAbnormally("gateway down")
      .onAttempt(2)
      .willRunForReal()
      .run();
    expect(run.result.isSucceeded()).toBe(true);
    expect(recorder.path).toEqual([
      "charge attempt 1 terminated abnormally: gateway down",
      "charge retrying",
      "charge attempt 2 succeeded",
      "journey succeeded",
    ]);
  });

  it("runs a step the script does not name for real", async () => {
    const [instance, recorder] = recorded(charge());
    await scripted(instance).run();
    expect(recorder.path).toEqual([
      "charge attempt 1 succeeded",
      "journey succeeded",
    ]);
  });

  it("asks for every step to be scripted from any point of the script", async () => {
    await expect(
      scripted(shop()).step("charge").willSucceed().ensureAllScripted().run(),
    ).rejects.toThrow(
      new TestMistake([{ kind: MistakeKind.StepLeftOut, step: "ship" }]),
    );
  });

  it("runs the journey on the executor it is given", async () => {
    const executor = new LocalExecutor(new DefaultDispatcherFactory());
    const instance = shop();
    const running = executor.run(instance);
    await expect(scripted(instance).run(executor)).rejects.toMatchObject({
      refused: { kind: "journey running" },
    });
    await running;
  });
});
