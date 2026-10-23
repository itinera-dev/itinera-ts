import { describe, expect, it } from "vitest";
import {
  abortedAt,
  attemptStarted,
  started,
  stepGivenUp,
  stepRescuing,
  stepSkipped,
  stepSucceeded,
} from "../../fixtures/trace.js";
import { attemptsOf, statusOf } from "../../../src/trace/status.js";

describe("statusOf", () => {
  it.each([
    ["succeeded", [attemptStarted("charge"), stepSucceeded("charge")]],
    ["failed", [attemptStarted("charge"), stepGivenUp("charge")]],
    [
      "succeeded, when the journey was aborted after it settled",
      [attemptStarted("charge"), stepSucceeded("charge"), abortedAt("charge")],
      "succeeded",
    ],
    ["skipped", [attemptStarted("charge"), stepSkipped("charge")]],
    ["aborted", [attemptStarted("charge"), abortedAt("charge")]],
    ["rescuing", [attemptStarted("charge"), stepRescuing("charge")]],
    [
      "aborted, when the journey was aborted while it was rescued",
      [
        attemptStarted("charge"),
        stepRescuing("charge"),
        abortedAt("charge_rescue"),
      ],
      "aborted",
    ],
    ["not executed", [attemptStarted("ship"), stepSucceeded("ship")]],
  ])(
    "reads a step that ended %s from the events",
    (name, events, status = name) => {
      expect(statusOf([started, ...events], "charge")).toBe(status);
    },
  );

  it("gives no status to a step still being attempted", () => {
    expect(statusOf([started, attemptStarted("charge")], "charge")).toBe(
      undefined,
    );
  });
});

describe("attemptsOf", () => {
  it("counts the attempts of the step that started, and no other's", () => {
    const events = [
      started,
      attemptStarted("charge"),
      attemptStarted("ship"),
      attemptStarted("charge"),
    ];
    expect(attemptsOf(events, "charge")).toBe(2);
  });
});
