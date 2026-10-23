import { describe, expect, it } from "vitest";
import { describeStep } from "../../../../src/step/descriptor.js";
import { Ship } from "../../../fixtures/step.js";
import type { WorkflowName } from "../../../../src/workflow.js";
import { Violations } from "../../../../src/workflow/violation.js";
import {
  assemble,
  type Parts,
} from "../../../../src/workflow/descriptor/assemble.js";

const nothing: Parts = {
  name: "orders" as WorkflowName,
  steps: [],
  reporters: [],
  policies: [],
  adapters: [],
  providers: [],
  idGenerator: undefined,
};

describe("assemble", () => {
  it("refuses a workflow with no name", () => {
    expect(() => assemble({ ...nothing, name: undefined }, "Orders")).toThrow(
      "workflow Orders has no name: give it one with @workflow or with its builder's name()",
    );
  });

  it("refuses a workflow with violations", () => {
    const ship = describeStep(Ship, { name: "ship" });
    expect(() =>
      assemble({ ...nothing, steps: [ship, ship] }, "Orders"),
    ).toThrow(Violations);
  });
});
