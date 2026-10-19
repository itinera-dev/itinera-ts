import { describe, expect, it } from "vitest";
import type { StepName } from "../step.js";
import { ViolationKind, Violations, violationsOf } from "./violation.js";

function steps(...names: string[]): { readonly name: StepName }[] {
  return names.map(named);
}

function named(name: string): { readonly name: StepName } {
  return { name: name as StepName };
}

describe("violationsOf", () => {
  it("finds nothing wrong with steps of different names", () => {
    expect(violationsOf(steps("charge", "ship"))).toEqual([]);
  });

  it("names each name two steps share once, in the order found", () => {
    expect(
      violationsOf(steps("ship", "charge", "ship", "charge", "ship")),
    ).toEqual([
      { kind: ViolationKind.DuplicateStepName, step: "ship" },
      { kind: ViolationKind.DuplicateStepName, step: "charge" },
    ]);
  });

  it("tells names apart by case", () => {
    expect(violationsOf(steps("ship", "Ship"))).toEqual([]);
  });
});

describe("Violations", () => {
  const thrown = new Violations([
    { kind: ViolationKind.DuplicateStepName, step: "ship" as StepName },
    { kind: ViolationKind.DuplicateStepName, step: "charge" as StepName },
  ]);

  it("says each violation on a line of its own", () => {
    expect(thrown.message).toBe(
      "duplicate step name: ship\nduplicate step name: charge",
    );
  });

  it("is an error named Violations", () => {
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe("Violations");
  });
});
