import { describe, expect, it } from "vitest";
import { step } from "../fixtures.js";
import { duplicateStepNames, rescuedStepsRetried, stepNamed } from "./steps.js";

describe("duplicateStepNames", () => {
  it("finds nothing wrong with steps of different names", () => {
    expect(duplicateStepNames([step("charge"), step("ship")])).toEqual([]);
  });

  it("names each name steps share once, in the order found", () => {
    expect(
      duplicateStepNames(
        ["ship", "charge", "ship", "charge", "ship"].map((name) => step(name)),
      ),
    ).toEqual([
      { kind: "duplicate step name", step: "ship" },
      { kind: "duplicate step name", step: "charge" },
    ]);
  });

  it("tells names apart by case", () => {
    expect(duplicateStepNames([step("ship"), step("Ship")])).toEqual([]);
  });

  it("counts a rescue step's name", () => {
    expect(
      duplicateStepNames([
        step("charge", { rescue: [] }),
        step("charge_rescue"),
      ]),
    ).toEqual([{ kind: "duplicate step name", step: "charge_rescue" }]);
  });
});

describe("rescuedStepsRetried", () => {
  it("names a step with a rescue step and a retry budget", () => {
    expect(
      rescuedStepsRetried([
        step("charge", { rescue: [], retryBudget: 1 }),
        step("ship", { retryBudget: 1 }),
        step("pack", { rescue: [] }),
      ]),
    ).toEqual([{ kind: "rescued step retried", step: "charge" }]);
  });
});

describe("stepNamed", () => {
  it.each([
    ["a step", "ship", "ship"],
    ["a rescue step", "charge_rescue", "charge_rescue"],
    ["a name no step has", "pack", undefined],
    ["the rescue step of a step without one", "ship_rescue", undefined],
  ])("finds %s by its name", (_, name, found) => {
    expect(
      stepNamed([step("charge", { rescue: [] }), step("ship")], name),
    ).toBe(found);
  });
});
