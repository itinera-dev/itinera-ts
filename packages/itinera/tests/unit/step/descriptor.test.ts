import { describe, expect, it } from "vitest";
import { declaredPolicy } from "../../../src/policy/declared.js";
import { Audit, Ledger } from "../../fixtures/policy.js";
import { type Outcome, Step } from "../../../src/step.js";
import { describeStep, requestsOfDescribed, rescueOf } from "../../../src/step/descriptor.js";
import { Refund, Ship } from "../../fixtures/step.js";
import { rescueGiven } from "../../../src/step/rescue/builder.js";

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

  it("gives the step's constructor what its requests were answered with, in order", () => {
    class Pack extends Step {
      constructor(
        readonly box: string,
        readonly count: number,
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(
      describeStep(Pack, {
        name: "pack",
        requests: { needs: [], run: [] },
      }).build(["small", 3]),
    ).toStrictEqual(new Pack("small", 3));
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
    const policies = [
      declaredPolicy(Ledger, "step"),
      declaredPolicy(Audit, "step"),
    ];
    const described = describeStep(Ship, { name: "ship", policies });
    expect(described.policies()).toEqual(policies);
  });

  it("attaches no step policies unless told", () => {
    expect(describeStep(Ship, { name: "ship" }).policies()).toEqual([]);
  });

  it("names the rescue step it is told after the step", () => {
    const described = describeStep(Ship, {
      name: "ship",
      rescue: rescueGiven(Refund),
    });
    expect(rescueOf(described)).toMatchObject({
      name: "ship_rescue",
      step: Refund,
    });
  });

  it("keeps what the step's decorators declared it requests, unless told", () => {
    expect(requestsOfDescribed(describeStep(Ship, { name: "ship" }))).toEqual({
      needs: [],
      run: [],
    });
  });

  it("gives a step no rescue step unless told", () => {
    expect(rescueOf(describeStep(Ship, { name: "ship" }))).toBeUndefined();
  });
});
