import type { Event } from "itinera/unstable";
import { describe, expect, it } from "vitest";
import {
  abortedAt,
  attemptStarted,
  started,
  stepGivenUp,
  stepRescuing,
  stepSkipped,
} from "../../fixtures/trace.js";
import { type Column, lineOf } from "../../../src/trace/line.js";

describe("lineOf", () => {
  it.each<[string, Event, [Column, string][]]>([
    ["journey_started", started, []],
    [
      "attempt_started",
      attemptStarted("charge"),
      [
        ["step", "charge"],
        ["attempt", "1"],
      ],
    ],
    [
      "step_skipped",
      stepSkipped("ship"),
      [
        ["step", "ship"],
        ["attempt", "1"],
        ["code", "nothing to ship"],
      ],
    ],
    [
      "step_given_up",
      stepGivenUp("charge"),
      [
        ["step", "charge"],
        ["attempt", "1"],
        ["cause", "abnormal termination"],
        ["decided by", "default"],
      ],
    ],
    [
      "step_rescuing",
      stepRescuing("charge"),
      [
        ["step", "charge"],
        ["attempt", "1"],
        ["cause", "abnormal termination"],
        ["rescue", "charge_rescue"],
        ["decided by", "default"],
      ],
    ],
    [
      "journey_aborted",
      abortedAt("charge"),
      [
        ["code", "reporter failed"],
        ["step", "charge"],
        ["error", "disk full"],
      ],
    ],
  ])("fills the columns of %s", (_, event, cells) => {
    expect([...lineOf(event).cells]).toEqual(cells);
  });

  it("carries a reason's message, which no column shows", () => {
    expect(lineOf(stepSkipped("ship")).carried).toEqual(["the cart is empty"]);
  });
});
