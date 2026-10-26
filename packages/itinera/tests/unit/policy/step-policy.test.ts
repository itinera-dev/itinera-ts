import { describe, expect, it } from "vitest";
import { Tracker } from "../../fixtures/policy.js";

describe("StepPolicy.builder", () => {
  it("refuses a class that keeps static data", () => {
    // @ts-expect-error a policy keeps no static data
    expect(() => Tracker.builder("tracker")).toThrow(
      `step policy Tracker keeps static data, which everything built from it would share: failures`,
    );
  });
});
