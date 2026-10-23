import { describe, it } from "vitest";
import { Attempt, type StepName } from "../../src/step.js";

declare function naming(step: StepName): void;

describe("StepName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a step name
    naming("charge");
  });
});

describe("Attempt", () => {
  it("is made only by itinera", () => {
    // @ts-expect-error the constructor is private
    new Attempt(2);
  });

  it("cannot be changed", () => {
    // @ts-expect-error its number is read-only
    Attempt.first.number = 2;
  });
});
