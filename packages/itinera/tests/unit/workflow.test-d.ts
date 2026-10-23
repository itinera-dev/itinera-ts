import { describe, it } from "vitest";
import type { AdapterName, WorkflowName } from "../../src/workflow.js";

declare function naming(workflow: WorkflowName): void;
declare function adapting(adapter: AdapterName): void;

describe("WorkflowName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a workflow name
    naming("orders");
  });
});

describe("AdapterName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not an adapter name
    adapting("pricing");
  });
});
