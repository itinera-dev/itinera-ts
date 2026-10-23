import { describe, expect, it } from "vitest";
import {
  type Fail,
  type GivenReason,
  type Skip,
  Step,
} from "../../src/step.js";
import { isOutcome } from "../../src/step/outcome.js";
import { Ship } from "../fixtures/step.js";

class Reporting extends Step {
  override run(): never {
    throw new Error("only its helpers are called");
  }

  failing(reason: GivenReason): Fail {
    return this.fail(reason);
  }

  skipping(): Skip {
    return this.skip();
  }

  skippingBecause(reason: GivenReason): Skip {
    return this.skipBecause(reason);
  }
}

describe("Step", () => {
  it("gives a step that succeeds the outcome success, which cannot be changed", () => {
    const outcome = new Ship().run();
    expect(outcome).toEqual({ kind: "success" });
    expect(Object.isFrozen(outcome)).toBe(true);
  });

  it.each([
    [
      "a failure for a reason",
      new Reporting().failing({ code: "declined", message: "no funds" }),
      { kind: "failure", reason: { code: "declined", message: "no funds" } },
    ],
    [
      "a failure for a code",
      new Reporting().failing("declined"),
      { kind: "failure", reason: { code: "declined" } },
    ],
    ["a skip", new Reporting().skipping(), { kind: "skipped" }],
    [
      "a skip for a reason",
      new Reporting().skippingBecause("nothing to do"),
      { kind: "skipped", reason: { code: "nothing to do" } },
    ],
  ])("gives a step its outcome: %s", (_, outcome, expected) => {
    expect([isOutcome(outcome), outcome]).toEqual([true, expected]);
  });
});
