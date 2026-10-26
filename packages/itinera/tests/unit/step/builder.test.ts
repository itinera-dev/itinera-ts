import { describe, expect, it } from "vitest";
import { type Outcome, Step } from "../../../src/step.js";
import { describedBy } from "../../../src/step/builder.js";
import { Ship } from "../../fixtures/step.js";

describe("Step.builder", () => {
  it("names the step, gives it no retries, and retries abnormal terminations, unless told otherwise", () => {
    expect(describedBy(Ship.builder("ship"))).toMatchObject({
      name: "ship",
      retryBudget: 0,
      retryOnAbnormalTermination: true,
    });
  });

  it("keeps the retries it is told", () => {
    const described = describedBy(
      Ship.builder("ship").retryBudget(3).noRetryOnAbnormalTermination(),
    );
    expect(described.retryBudget).toBe(3);
    expect(described.retryOnAbnormalTermination).toBe(false);
  });

  it("describes a step of its own class", () => {
    expect(describedBy(Ship.builder("ship")).build()).toBeInstanceOf(Ship);
  });

  it("refuses an empty name at once", () => {
    expect(() => Ship.builder("")).toThrow(
      "a step of class Ship has an empty name",
    );
  });

  it.each([
    ["a negative number", -1],
    ["a fraction", 1.5],
  ])("refuses at once a retry budget that is %s", (_, retries) => {
    expect(() => Ship.builder("ship").retryBudget(retries)).toThrow(
      `step ship has a retry budget of ${String(retries)}, not a whole number from 0`,
    );
  });

  it("refuses at once a step whose constructor has a parameter with no request", () => {
    class Weigh extends Step {
      constructor(readonly grams: number) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expect(() => Weigh.builder("weigh")).toThrow(
      "the constructor of Weigh: parameter 1 carries no request",
    );
  });
});
