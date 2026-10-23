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
    const { steps, target } = scripted(rescued(), [
      ending(Ending.failure("declined")),
      ending(Ending.success),
    ]);
    const rescue = targetOf(steps, "charge_rescue");
    expect(leftOut([target, rescue], steps, false)).toEqual([
      { kind: MistakeKind.AttemptLeftOut, step: "charge_rescue", attempt: 1 },
    ]);
  });

  it("leaves out every step not scripted when every step is asked for", () => {
    const { steps, target } = scripted(charge(), [ending(Ending.success)]);
    expect(leftOut([target], steps, true)).toEqual([
      { kind: MistakeKind.StepLeftOut, step: "ship" },
    ]);
    expect(leftOut([target], steps, false)).toEqual([]);
  });
});
