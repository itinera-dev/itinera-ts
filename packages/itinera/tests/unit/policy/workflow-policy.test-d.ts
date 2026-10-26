import { describe, it } from "vitest";
import { WorkflowPolicy } from "../../../src/policy/workflow-policy.js";

describe("WorkflowPolicy.builder", () => {
  it("does not compile on a policy keeping static data, its own or inherited", () => {
    class Census extends WorkflowPolicy {
      static journeys = 0;
    }
    class Strict extends Census {}
    // @ts-expect-error a policy keeps no static data
    Census.builder();
    // @ts-expect-error nor inherits any
    Strict.builder();
  });
});
