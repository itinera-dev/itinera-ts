import { describe, expect, it } from "vitest";
import { Audit, Ledger } from "../../fixtures/policy.js";
import { describeStep, policiesOf, rescueOf } from "../../../src/step/descriptor.js";
import { Refund, Ship } from "../../fixtures/step.js";

describe("describeStep", () => {
  it("gives a step no retries, and retries abnormal terminations, unless told otherwise", () => {
    const described = describeStep(Ship, { name: "ship" });
    expect(described.retryBudget).toBe(0);
    expect(described.retryOnAbnormalTermination).toBe(true);
  });

  it("keeps the retries it is told", () => {
    const described = describeStep(Ship, {
      name: "ship",
      retryBudget: 3,
      noRetryOnAbnormalTermination: true,
    });
    expect(described.retryBudget).toBe(3);
    expect(described.retryOnAbnormalTermination).toBe(false);
  });

  it("builds a new step for every attempt", () => {
    const described = describeStep(Ship, { name: "ship" });
    const first = described.build();
    expect(first).toBeInstanceOf(Ship);
    expect(described.build()).not.toBe(first);
  });

  it("cannot be changed", () => {
    expect(Object.isFrozen(describeStep(Ship, { name: "ship" }))).toBe(true);
  });

  it("refuses an empty name", () => {
    expect(() => describeStep(Ship, { name: "" })).toThrow(
      "a step of class Ship has an empty name",
    );
  });

  it.each([
    ["a negative number", -1],
    ["a fraction", 1.5],
    ["not a number", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
  ])("refuses a retry budget that is %s", (_, retryBudget) => {
    expect(() => describeStep(Ship, { name: "ship", retryBudget })).toThrow(
      `step ship has a retry budget of ${String(retryBudget)}, not a whole number from 0`,
    );
  });

  it("keeps the step policies attached, in order", () => {
    const described = describeStep(Ship, {
      name: "ship",
      policies: [Ledger, Audit],
    });
    expect(policiesOf(described)).toEqual([Ledger, Audit]);
  });

  it("attaches no step policies unless told", () => {
    expect(policiesOf(describeStep(Ship, { name: "ship" }))).toEqual([]);
  });

  it("keeps the rescue step it is told", () => {
    const described = describeStep(Ship, { name: "ship", rescue: Refund });
    expect(rescueOf(described)).toBe(Refund);
  });

  it("gives a step no rescue step unless told", () => {
    expect(rescueOf(describeStep(Ship, { name: "ship" }))).toBeUndefined();
  });
});
