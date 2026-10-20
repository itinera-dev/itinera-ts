import { describe, expect, it } from "vitest";
import { keeping, orders } from "../../engine/fixtures.js";
import { input } from "../../step/request.js";
import { fromRescuedStep } from "../../step/rescue.js";
import { integer, string } from "../../value/token.js";
import { MistakeKind, TestMistake } from "../mistake.js";
import { scripted } from "../scripted.js";
import { stepMock } from "../step-mock.js";
import { Ending } from "../ending.js";
import { rescueStepMock } from "../rescue-step-mock.js";
import { charge, rescued, shop } from "./fixtures.js";
import type { AttemptRecord } from "./record.js";

function charging() {
  return keeping([])
    .builder("charge")
    .needs(input("amount", integer))
    .retryBudget(1);
}

function numberOf(record: AttemptRecord): number {
  return record.attempt.number;
}

describe("ScriptedRun", () => {
  it("holds the journey's result", async () => {
    const run = await scripted(shop()).step("charge").willSucceed().run();
    expect(run.result.isSucceeded()).toBe(true);
  });

  it("throws a test mistake for a step the workflow does not have", async () => {
    const run = await scripted(shop()).run();
    expect(() => run.step("chrage")).toThrow(
      new TestMistake([{ kind: MistakeKind.UnknownStep, step: "chrage" }]),
    );
  });

  it("records a rescue step the journey never reached, without attempts", async () => {
    const run = await scripted(shop(rescued()))
      .step("charge")
      .willSucceed()
      .run();
    expect(run.step("charge_rescue").attempts).toEqual([]);
  });
});

describe("StepRecord", () => {
  it("holds each attempt handed to the construction of its step, scripted or real, in order", async () => {
    const run = await scripted(orders(charging()).instance({ amount: 40 }))
      .step("charge")
      .willFail("declined")
      .onAttempt(2)
      .willRunForReal()
      .run();
    const attempts = run.step("charge").attempts;
    expect(attempts.map(numberOf)).toEqual([1, 2]);
    expect(run.step("charge").attempt(2).unwrap()).toBe(attempts[1]);
  });

  it.each([
    ["0", 0],
    ["past the last", 2],
  ])("reads no attempt numbered %s", async (_, number) => {
    const run = await scripted(shop()).run();
    expect(run.step("charge").attempt(number).isNone()).toBe(true);
  });

  it("holds no attempt that ended before its step's constructor was called", async () => {
    const run = await scripted(orders(charging()).instance()).run();
    expect(run.result.abort?.reason).toBe("required data missing");
    expect(run.step("charge").attempts).toEqual([]);
  });

  it("holds an attempt whose constructor failed", async () => {
    const failing = stepMock({
      attempts: [Ending.success],
      buildFailure: "no gateway",
    }).builder("charge");
    const run = await scripted(orders(failing).instance()).run();
    expect(run.step("charge").attempts).toHaveLength(1);
  });
});

describe("AttemptRecord", () => {
  it("reads the inputs its step was built with", async () => {
    const run = await scripted(orders(charging()).instance({ amount: 40 }))
      .step("charge")
      .willSucceed()
      .run();
    const attempt = run.step("charge").attempt(1).unwrap();
    expect(attempt.input("amount", integer).option().unwrap()).toBe(40);
    expect(attempt.input("currency", integer).kind).toBe("absent");
  });

  it("reads, for a rescue step, the contributions it requested of the failed attempt", async () => {
    const run = await scripted(
      orders(
        charge().rescue(
          rescueStepMock({ attempts: [Ending.success] })
            .builder()
            .needs(fromRescuedStep("card", string)),
        ),
      ).instance(),
    )
      .step("charge")
      .willContribute("card", "expired")
      .willFail("expired")
      .onAttempt(2)
      .willSucceed()
      .andStep("charge_rescue")
      .willSucceed()
      .run();
    const rescue = run.step("charge_rescue").attempt(1).unwrap();
    expect(rescue.input("card", string).option().unwrap()).toBe("expired");
  });
});
