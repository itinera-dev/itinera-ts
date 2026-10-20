/** How each hook of a scenario's policy ends, as test support's policy mocks play it. */
import {
  type FailureHookEnding,
  HookEnding,
  type HookFails,
  StepHook,
  type StepPolicyMockScript,
  WorkflowHook,
  type WorkflowHookEnding,
  type WorkflowPolicyMockScript,
} from "itinera/unstable";
import { ModelError } from "../../model/error.js";
import type {
  HookReturn,
  HookScript,
  PolicyScript,
} from "../../model/policy.js";

/** The message a hook throws with when the case gives none. */
const unwrittenHookFailure = "the scripted hook failed";

/** The script of the step policy mock playing how each hook of the policy ends. */
export function stepEndingsOf(script: PolicyScript): StepPolicyMockScript {
  const { hooks, buildFailure } = script;
  const success = hooks.get(StepHook.OnStepSuccess);
  return {
    onStepSuccess:
      success?.ending.kind === "finish workflow"
        ? HookEnding.finishWorkflow
        : failureEndingOf(success),
    onStepFailure: failureEndingOf(hooks.get(StepHook.OnStepFailure)),
    onStepRetry: failureEndingOf(hooks.get(StepHook.OnStepRetry)),
    onStepAbnormalTermination: failureEndingOf(
      hooks.get(StepHook.OnStepAbnormalTermination),
    ),
    buildFailure,
  };
}

/** The script of the workflow policy mock playing how each hook of the policy ends. */
export function workflowEndingsOf(
  script: PolicyScript,
): WorkflowPolicyMockScript {
  const { hooks, buildFailure } = script;
  return {
    onWorkflowSuccess: workflowEndingOf(
      hooks.get(WorkflowHook.OnWorkflowSuccess),
    ),
    onWorkflowFailure: workflowEndingOf(
      hooks.get(WorkflowHook.OnWorkflowFailure),
    ),
    buildFailure,
  };
}

function failureEndingOf(
  script: HookScript | undefined,
): FailureHookEnding | undefined {
  const ending = script?.ending;
  switch (ending?.kind) {
    case undefined:
    case "keep default":
      return undefined;
    case "fail workflow":
      return HookEnding.failWorkflow(ending.code);
    case "fail":
      return hookFailure(ending);
    case "finish workflow":
      throw new ModelError("only on step success can finish the workflow");
  }
}

function workflowEndingOf(
  script: HookScript | undefined,
): WorkflowHookEnding | undefined {
  const ending = script?.ending;
  switch (ending?.kind) {
    case undefined:
    case "keep default":
      return undefined;
    case "fail":
      return hookFailure(ending);
    case "fail workflow":
    case "finish workflow":
      throw new ModelError("a workflow hook returns no lifecycle");
  }
}

function hookFailure(
  ending: Extract<HookReturn, { readonly kind: "fail" }>,
): HookFails {
  return HookEnding.fail(ending.message ?? unwrittenHookFailure);
}
