import { describe, expect, it } from "vitest";
import type { StepDescriptor } from "../../step.js";
import { charge, rescued, shop } from "./fixtures.js";
import { everyName, targetNamed } from "./target.js";

function stepsOf(
  charging: Parameters<typeof shop>[0],
): readonly StepDescriptor[] {
  return shop(charging).descriptor.steps();
}

describe("Target", () => {
  it.each([
    ["one for a step without retries", charge(), "charge", 1],
    ["one more than its retry budget", charge().retryBudget(2), "charge", 3],
    ["two for a step with a rescue step", rescued(), "charge", 2],
    ["one for a rescue step", rescued(), "charge_rescue", 1],
  ])("can have %s", (_, charging, name, most) => {
    expect(targetNamed(stepsOf(charging), name)?.mostAttempts).toBe(most);
  });

  it("knows whether its step declares a contributor and a reporter", () => {
    const steps = stepsOf(charge());
    const [charging, shipping] = [
      targetNamed(steps, "charge"),
      targetNamed(steps, "ship"),
    ];
    expect([charging?.contributes, charging?.reports]).toEqual([true, true]);
    expect([shipping?.contributes, shipping?.reports]).toEqual([false, false]);
  });
});

describe("targetNamed", () => {
  it("finds no target for a name the workflow does not have", () => {
    expect(targetNamed(stepsOf(charge()), "chrage")).toBeUndefined();
  });
});

describe("everyName", () => {
  it("names every step and rescue step, in order", () => {
    expect(everyName(stepsOf(rescued()))).toEqual([
      "charge",
      "charge_rescue",
      "ship",
    ]);
  });
});
