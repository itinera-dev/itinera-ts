import { describe, it } from "vitest";
import { StepPolicy } from "../../../src/policy/step-policy.js";

describe("StepPolicy.builder", () => {
  it("does not compile on a policy keeping static data, its own or inherited", () => {
    class Tracker extends StepPolicy {
      static failures = 0;
    }
    class Strict extends Tracker {}
    // @ts-expect-error a policy keeps no static data
    Tracker.builder();
    // @ts-expect-error nor inherits any
    Strict.builder();
  });
});
