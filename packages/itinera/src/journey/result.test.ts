import { describe, expect, it } from "vitest";
import type { JourneyId } from "../journey.js";
import { dataBagOf } from "./data-bag.js";
import { resultOf } from "./result.js";

const journeyId = "journey-1" as JourneyId;
const dataBag = dataBagOf(new Map([["order", "A-1"]]));
const failure = {
  cause: "abnormal termination",
  error: "down",
  errorMessage: "down",
} as const;
const abort = {
  reason: "reporter failed",
  errorMessage: "disk full",
  error: "disk full",
} as const;

describe("resultOf", () => {
  it("says a journey that succeeded succeeded, with no failure and no abort", () => {
    const result = resultOf(journeyId, { kind: "succeeded", dataBag });
    expect([
      result.isSucceeded(),
      result.isFailed(),
      result.isAborted(),
    ]).toEqual([true, false, false]);
    expect([result.failure, result.abort]).toEqual([undefined, undefined]);
  });

  it("says a journey that failed failed, and gives its failure", () => {
    const result = resultOf(journeyId, { kind: "failed", failure, dataBag });
    expect([
      result.isSucceeded(),
      result.isFailed(),
      result.isAborted(),
    ]).toEqual([false, true, false]);
    expect(result.failure).toBe(failure);
  });

  it("says a journey that was aborted was aborted, and gives its abort", () => {
    const result = resultOf(journeyId, { kind: "aborted", abort });
    expect([
      result.isSucceeded(),
      result.isFailed(),
      result.isAborted(),
    ]).toEqual([false, false, true]);
    expect([result.failure, result.abort]).toEqual([undefined, abort]);
  });

  it("gives a frozen result, with a frozen status", () => {
    const result = resultOf(journeyId, { kind: "succeeded", dataBag });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.status)).toBe(true);
  });
});
