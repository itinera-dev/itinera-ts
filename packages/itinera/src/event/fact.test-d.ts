import { describe, expectTypeOf, it } from "vitest";
import type { StepHookCalled, WorkflowHookCalled } from "./fact.js";

describe("hook_called", () => {
  it("carries a lifecycle only from a hook of a step policy", () => {
    expectTypeOf<StepHookCalled>().toHaveProperty("lifecycle");
    expectTypeOf<WorkflowHookCalled>().not.toHaveProperty("lifecycle");
  });
});
