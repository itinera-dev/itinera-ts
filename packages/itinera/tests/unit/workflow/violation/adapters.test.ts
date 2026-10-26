import { describe, expect, it } from "vitest";
import {
  adaptersForUnknownSteps,
  duplicateAdapterNames,
  stepsAdaptedTwice,
} from "../../../../src/workflow/violation/adapters.js";
import { adapter, step } from "../../../fixtures/workflow.js";

const steps = [step("charge", { rescue: [] }), step("ship")];

describe("duplicateAdapterNames", () => {
  it("names each name more than one adapter has, once", () => {
    expect(
      duplicateAdapterNames([
        adapter("pricing", "charge"),
        adapter("pricing", "ship"),
        adapter("pricing", "charge_rescue"),
        adapter("credentials", "ship"),
      ]),
    ).toEqual([{ kind: "duplicate adapter name", adapter: "pricing" }]);
  });
});

describe("adaptersForUnknownSteps", () => {
  it.each([
    ["a step the workflow does not have", "pack"],
    ["the rescue step of a step without one", "ship_rescue"],
  ])("names an adapter attached to %s", (_, name) => {
    expect(
      adaptersForUnknownSteps(steps, [adapter("pricing", "charge", name)]),
    ).toEqual([
      {
        kind: "input adapter for unknown step",
        adapter: "pricing",
        step: name,
      },
    ]);
  });
});

describe("stepsAdaptedTwice", () => {
  it("names the step and every adapter attached to it, in order", () => {
    expect(
      stepsAdaptedTwice(steps, [
        adapter("pricing", "charge"),
        adapter("credentials", "charge_rescue", "charge"),
        adapter("tokens", "charge_rescue"),
      ]),
    ).toEqual([
      {
        kind: "step adapted twice",
        step: "charge",
        adapters: ["pricing", "credentials"],
      },
      {
        kind: "step adapted twice",
        step: "charge_rescue",
        adapters: ["credentials", "tokens"],
      },
    ]);
  });

  it("names a step that one adapter lists twice", () => {
    expect(
      stepsAdaptedTwice(steps, [adapter("pricing", "charge", "charge")]),
    ).toEqual([
      {
        kind: "step adapted twice",
        step: "charge",
        adapters: ["pricing", "pricing"],
      },
    ]);
  });

  it("leaves out adapters attached to an unknown step", () => {
    expect(
      stepsAdaptedTwice(steps, [
        adapter("one", "pack"),
        adapter("two", "pack"),
      ]),
    ).toEqual([]);
  });
});
