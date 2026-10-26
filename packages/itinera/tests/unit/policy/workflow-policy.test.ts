import { describe, expect, it } from "vitest";
import { Census } from "../../fixtures/policy.js";

describe("WorkflowPolicy.builder", () => {
  it("refuses a class that keeps static data", () => {
    // @ts-expect-error a policy keeps no static data
    expect(() => Census.builder("census")).toThrow(
      `workflow policy Census keeps static data, which everything built from it would share: journeys`,
    );
  });
});
