import { describe, expect, it } from "vitest";
import type { StepClass } from "../../../../src/step.js";
import type { StepBuilder } from "../../../../src/step/builder.js";
import { Ending } from "../../../../src/testing/ending.js";
import { MistakeKind } from "../../../../src/testing/mistake.js";
import { leftOut } from "../../../../src/testing/scripted/checks.js";
import { charge, rescued, shop } from "../../../fixtures/testing/scripted.js";
import {
  type Described,
  type Target,
  targetNamed,
} from "../../../../src/testing/scripted/target.js";

const realRun: Described = { kind: "real run" };

function ending(ended: Ending): Described {
  return { kind: "played", actions: [], ending: ended };
}

/** The target `name` of a shop whose first step is `charging`, with its attempts numbered as `numbered`. */
function scripted(
  charging: StepBuilder<StepClass>,
  numbered: readonly Described[],
  name = "charge",
): { readonly steps: ReturnType<typeof stepsOf>; readonly target: Target } {
  const steps = stepsOf(charging);
  const target = targetOf(steps, name);
  target.numbered.push(...numbered);
  return { steps, target };
}

/** A shop whose `charge` has a rescue step, with the attempts of each numbered as given. */
function rescuedScripted(
  numbered: readonly Described[],
  rescueNumbered: readonly Described[],
): {
  readonly steps: ReturnType<typeof stepsOf>;
  readonly target: Target;
  readonly rescue: Target;
} {
  const { steps, target } = scripted(rescued(), numbered);
  const rescue = targetOf(steps, "charge_rescue");
  rescue.numbered.push(...rescueNumbered);
  return { steps, target, rescue };
}

function targetOf(steps: ReturnType<typeof stepsOf>, name: string): Target {
  const target = targetNamed(steps, name);
  if (target === undefined) {
    throw new Error(`the shop has no step ${name}`);
  }
  return target;
}

function stepsOf(charging: StepBuilder<StepClass>) {
  return shop(charging).descriptor.steps();
}

function attemptLeftOut(attempt: number) {
  return { kind: MistakeKind.AttemptLeftOut, step: "charge", attempt };
}

describe("leftOut", () => {
  it.each([
    ["success", ending(Ending.success), []],
    ["skip", ending(Ending.skip), []],
    ["failure", ending(Ending.failure("declined")), [attemptLeftOut(2)]],
    [
      "abnormal termination, retried",
      ending(Ending.abnormalTermination("down")),
      [attemptLeftOut(2)],
    ],
    ["real run", realRun, [attemptLeftOut(2)]],
  ])(
    "leaves out the next attempt only when one can follow a %s",
    (_, first, mistakes) => {
      const { steps, target } = scripted(charge().retryBudget(1), [first]);
      expect(leftOut([target], steps, false)).toEqual(mistakes);
    },
  );

  it("leaves out no attempt after an abnormal termination of a step that does not retry them", () => {
    const { steps, target } = scripted(
      charge().retryBudget(1).noRetryOnAbnormalTermination(),
      [ending(Ending.abnormalTermination("down"))],
    );
    expect(leftOut([target], steps, false)).toEqual([]);
  });

  it("names only the first attempt left out", () => {
    const { steps, target } = scripted(charge().retryBudget(3), [
      ending(Ending.failure("declined")),
    ]);
    expect(leftOut([target], steps, false)).toEqual([attemptLeftOut(2)]);
  });

  it("leaves out nothing once the remaining attempts are described", () => {
    const { steps, target } = scripted(charge().retryBudget(3), [realRun]);
    target.rest = ending(Ending.failure("declined"));
    expect(leftOut([target], steps, false)).toEqual([]);
  });

  it("leaves out the rescue step, and attempt 2, of a step that can fail on attempt 1", () => {
    const { steps, target } = scripted(rescued(), [
      ending(Ending.abnormalTermination("down")),
    ]);
    expect(leftOut([target], steps, false)).toEqual([
      attemptLeftOut(2),
      {
        kind: MistakeKind.RescueStepLeftOut,
        step: "charge_rescue",
        rescued: "charge",
      },
    ]);
  });

  it("leaves out no rescue step of a step whose attempt 1 cannot fail", () => {
    const { steps, target } = scripted(rescued(), [ending(Ending.success)]);
    expect(leftOut([target], steps, false)).toEqual([]);
  });

  it("leaves out no rescue step that is scripted", () => {
    const { steps, target, rescue } = rescuedScripted(
      [ending(Ending.failure("declined")), ending(Ending.success)],
      [],
    );
    expect(leftOut([target, rescue], steps, false)).toEqual([
      { kind: MistakeKind.AttemptLeftOut, step: "charge_rescue", attempt: 1 },
    ]);
  });

  it.each([
    ["fails", ending(Ending.failure("broken")), []],
    [
      "terminates abnormally",
      ending(Ending.abnormalTermination("crashed")),
      [],
    ],
    ["succeeds", ending(Ending.success), [attemptLeftOut(2)]],
    ["runs for real", realRun, [attemptLeftOut(2)]],
  ])(
    "leaves out attempt 2 of a rescued step only when its rescue step may succeed: one that %s",
    (_, rescueEnding, expected) => {
      const { steps, target, rescue } = rescuedScripted(
        [ending(Ending.failure("declined"))],
        [rescueEnding],
      );
      expect(leftOut([target, rescue], steps, false)).toEqual(expected);
    },
  );

  it.each([
    ["fails", Ending.failure("broken")],
    ["terminates abnormally", Ending.abnormalTermination("crashed")],
  ])(
    "leaves out no attempt after a rescued step's real run when its rescue step %s",
    (_, rescueEnding) => {
      const { steps, target, rescue } = rescuedScripted(
        [realRun],
        [ending(rescueEnding)],
      );
      expect(leftOut([target, rescue], steps, false)).toEqual([]);
    },
  );

  it("leaves out nothing when an attempt is described after a rescue step that fails", () => {
    const { steps, target, rescue } = rescuedScripted(
      [ending(Ending.failure("declined")), ending(Ending.success)],
      [ending(Ending.failure("broken"))],
    );
    expect(leftOut([target, rescue], steps, false)).toEqual([]);
  });

  it("leaves out every step not scripted when every step is asked for", () => {
    const { steps, target } = scripted(charge(), [ending(Ending.success)]);
    expect(leftOut([target], steps, true)).toEqual([
      { kind: MistakeKind.StepLeftOut, step: "ship" },
    ]);
    expect(leftOut([target], steps, false)).toEqual([]);
  });
});
