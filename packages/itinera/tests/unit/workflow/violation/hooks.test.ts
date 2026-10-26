import { describe, expect, it } from "vitest";
import {
  Audit,
  Close,
  Ledger,
  Notify,
  Quiet,
} from "../../../fixtures/policy.js";
import { stepPolicyGiven } from "../../../../src/policy/step-policy/builder.js";
import { workflowPolicyGiven } from "../../../../src/policy/workflow-policy/builder.js";
import { step } from "../../../fixtures/workflow.js";
import {
  stepHooksDefinedTwice,
  workflowHooksDefinedTwice,
} from "../../../../src/workflow/violation/hooks.js";

describe("stepHooksDefinedTwice", () => {
  it("names the step, the hook and every policy defining it", () => {
    const policies = [stepPolicyGiven(Audit), stepPolicyGiven(Ledger)];
    expect(stepHooksDefinedTwice(step("charge", { policies }))).toEqual([
      {
        kind: "hook defined twice",
        step: "charge",
        hook: "on step success",
        policies: ["audit", "ledger"],
      },
    ]);
  });

  it("finds nothing wrong with one policy per hook", () => {
    expect(
      stepHooksDefinedTwice(
        step("charge", { policies: [stepPolicyGiven(Audit)] }),
      ),
    ).toEqual([]);
  });
});

describe("workflowHooksDefinedTwice", () => {
  it("names the hook and every policy defining it", () => {
    expect(
      workflowHooksDefinedTwice([
        workflowPolicyGiven(Notify),
        workflowPolicyGiven(Close.builder("close").onWorkflowFailure("failed")),
        workflowPolicyGiven(Quiet),
      ]),
    ).toEqual([
      {
        kind: "hook defined twice",
        hook: "on workflow success",
        policies: ["notify", "quiet"],
      },
    ]);
  });
});
