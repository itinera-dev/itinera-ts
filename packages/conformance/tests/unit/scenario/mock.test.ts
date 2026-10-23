import { Ending } from "itinera/unstable";
import { describe, expect, it } from "vitest";
import { ModelError } from "../../../src/model/error.js";
import type { AttemptOutcome } from "../../../src/model/step/attempt.js";
import { type StepScript, unscripted } from "../../../src/model/step.js";
import { rescueMockScriptOf } from "../../../src/scenario/mock.js";

/** A step whose only attempt ends as `outcome` says. */
function endingAs(outcome: AttemptOutcome): StepScript {
  return { ...unscripted(), attempts: [{ outcome, contributes: [] }] };
}

describe("rescueMockScriptOf", () => {
  it("plays a rescue step's ending as the step mock plays it, its build failure included", () => {
    const script = {
      ...endingAs({ kind: "failure", reason: { code: "no-refresh" } }),
      constructorFailure: "no client",
    };
    expect(rescueMockScriptOf(script)).toEqual({
      attempts: [Ending.failure({ code: "no-refresh" })],
      asynchronous: false,
      buildFailure: "no client",
    });
  });

  it("succeeds when the script says nothing of how a rescue step ends", () => {
    expect(rescueMockScriptOf(unscripted()).attempts).toEqual([Ending.success]);
  });

  it("refuses a rescue step that skips, which a rescue step cannot do", () => {
    expect(() => rescueMockScriptOf(endingAs({ kind: "skipped" }))).toThrow(
      new ModelError("a rescue step cannot skip"),
    );
  });
});
