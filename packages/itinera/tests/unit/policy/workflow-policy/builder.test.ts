import { describe, expect, it } from "vitest";
import { kindOf } from "../../../../src/policy/descriptor.js";
import { Close, Notify } from "../../../fixtures/policy.js";
import { workflowPolicyGiven } from "../../../../src/policy/workflow-policy/builder.js";

describe("a workflow policy's builder", () => {
  it("describes the hooks it is given", () => {
    const described = workflowPolicyGiven(
      Close.builder("close")
        .onWorkflowSuccess("closed")
        .onWorkflowFailure("failed"),
    );
    expect(kindOf(described)).toBe("workflow");
    expect(described.hooks()).toEqual([
      "on workflow success",
      "on workflow failure",
    ]);
    expect(described.build()).toBeInstanceOf(Close);
  });
});

describe("a workflow policy given as a class", () => {
  it("is the descriptor its decorator made", () => {
    expect(workflowPolicyGiven(Notify).name).toBe("notify");
  });

  it("is refused when it is not declared with @workflowPolicy", () => {
    expect(() => workflowPolicyGiven(Close)).toThrow(
      "Close is not declared with @workflowPolicy",
    );
  });
});
