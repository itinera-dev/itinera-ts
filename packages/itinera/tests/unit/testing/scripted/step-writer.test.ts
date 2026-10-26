import { describe, expect, it } from "vitest";
import {
  type Mistake,
  MistakeKind,
  TestMistake,
} from "../../../../src/testing/mistake.js";
import { Level } from "../../../../src/testing/emitted.js";
import { scripted } from "../../../../src/testing/scripted.js";
import { charge, rescued, shop } from "../../../fixtures/testing/scripted.js";

/** The step `charge` of a shop, retried `retries` times, just named. */
function charging(retries = 0) {
  return scripted(shop(charge().retryBudget(retries))).step("charge");
}

/** The step `ship` of a shop, just named. */
function shipping() {
  return scripted(shop()).step("ship");
}

/** The rescue step of the step `charge` of a shop, just named. */
function rescue() {
  return scripted(shop(rescued())).step("charge_rescue");
}

function mistaken(mistake: Mistake): TestMistake {
  return new TestMistake([mistake]);
}

describe("StepWriter", () => {
  it("describes attempt 1 when no attempt is chosen", () => {
    expect(() => charging(1).willFail("declined").onAttempt(2)).not.toThrow();
  });

  it.each([
    ["0", 0, MistakeKind.NoSuchAttempt],
    ["-1", -1, MistakeKind.NoSuchAttempt],
    ["a fraction", 1.5, MistakeKind.NoSuchAttempt],
    ["one past the most it can have", 3, MistakeKind.NoSuchAttempt],
    ["one described before", 1, MistakeKind.AttemptScriptedTwice],
  ])("throws a test mistake for an attempt numbered %s", (_, attempt, kind) => {
    expect(() => charging(1).willFail("declined").onAttempt(attempt)).toThrow(
      mistaken({ kind, step: "charge", attempt }),
    );
  });

  it("throws a test mistake naming an attempt chosen before the attempt before it", () => {
    expect(() => charging(2).onAttempt(3)).toThrow(
      mistaken({
        kind: MistakeKind.GapInTheAttempts,
        step: "charge",
        attempt: 3,
      }),
    );
  });

  it("throws a test mistake for an attempt once the remaining attempts are described", () => {
    expect(() =>
      charging(2).onRemainingAttempts().willFail("declined").onAttempt(1),
    ).toThrow(
      mistaken({
        kind: MistakeKind.AttemptScriptedTwice,
        step: "charge",
        attempt: 1,
      }),
    );
  });

  it("names an attempt the step can never have rather than one described already", () => {
    expect(() =>
      charging(1).onEveryAttempt().willFail("declined").onAttempt(5),
    ).toThrow(
      mistaken({
        kind: MistakeKind.NoSuchAttempt,
        step: "charge",
        attempt: 5,
      }),
    );
  });

  it("throws a test mistake for every attempt once one is described", () => {
    expect(() => charging(1).willFail("declined").onEveryAttempt()).toThrow(
      mistaken({
        kind: MistakeKind.AttemptScriptedTwice,
        step: "charge",
        attempt: 1,
      }),
    );
  });

  it("throws a test mistake for every attempt once the remaining attempts are described", () => {
    expect(() =>
      charging(1).onRemainingAttempts().willFail("declined").onEveryAttempt(),
    ).toThrow(
      mistaken({
        kind: MistakeKind.AttemptScriptedTwice,
        step: "charge",
        attempt: 1,
      }),
    );
  });

  it("throws a test mistake for the remaining attempts once described", () => {
    expect(() =>
      charging(1)
        .onRemainingAttempts()
        .willFail("declined")
        .onRemainingAttempts(),
    ).toThrow(
      mistaken({
        kind: MistakeKind.AttemptScriptedTwice,
        step: "charge",
        attempt: 1,
      }),
    );
  });

  it("throws a test mistake for the remaining attempts when every attempt is numbered", () => {
    expect(() =>
      charging(1)
        .willFail("declined")
        .onAttempt(2)
        .willSucceed()
        .onRemainingAttempts(),
    ).toThrow(
      mistaken({
        kind: MistakeKind.NoSuchAttempt,
        step: "charge",
        attempt: 3,
      }),
    );
  });

  it("throws a test mistake for a contribution of a step that declares no contributor", () => {
    expect(() => shipping().willContribute("parcel", "box")).toThrow(
      mistaken({ kind: MistakeKind.NoContributor, step: "ship" }),
    );
  });

  it.each([
    ["an event", () => shipping().willEmit(Level.Info, "shipped")],
    ["global metadata", () => shipping().willSetGlobalMetadata("box", "S")],
  ])(
    "throws a test mistake for %s of a step that declares no reporter",
    (_, writing) => {
      expect(writing).toThrow(
        mistaken({ kind: MistakeKind.NoReporter, step: "ship" }),
      );
    },
  );

  it.each([
    ["without a reason", () => rescue().willSkip()],
    ["for a reason", () => rescue().willSkipBecause("nothing to refund")],
  ])("throws a test mistake for a rescue step that skips %s", (_, writing) => {
    expect(writing).toThrow(
      mistaken({ kind: MistakeKind.RescueStepSkips, step: "charge_rescue" }),
    );
  });

  it("throws a type error for a contribution that is not a value", () => {
    expect(() =>
      charging().willContribute("due", new Date() as unknown as string),
    ).toThrow(
      new TypeError(
        "the value contributed under due is not a value: is an object whose prototype is not plain",
      ),
    );
  });
});
