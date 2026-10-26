import type { Contributor } from "itinera/journey";
import { type HookReporter, StepHook, WorkflowHook } from "itinera/policy";
import { ModelError } from "../model/error.js";
import { type Hook, hookNamed, type PolicyScript } from "../model/policy.js";
import type { Model } from "../model.js";
import {
  stepEndingsOf,
  workflowEndingsOf,
} from "../scenario/policies/endings.js";
import {
  stepPolicyClass,
  workflowPolicyClass,
} from "../scenario/policy-mocks.js";
import type { Witness } from "../witness.js";

/** The handles a hook called alone is lent. */
interface HookLent {
  readonly contributor: Contributor;
  readonly reporter: HookReporter;
}

/**
 * Calls the hook of the scenario's policy on a new object of the policy,
 * outside any journey, with the handles `lent`.
 *
 * @throws ModelError when the policy does not define the hook, or when the
 * hook requests more than its handles, which a hook called alone is not given.
 */
export async function hookCalled(
  model: Model,
  witness: Witness,
  policy: string,
  name: string,
  lent: HookLent,
): Promise<void> {
  const script = model.policies.policy(policy);
  const hook = hookNamed(script.kind, name);
  const defined = script.hooks.get(hook);
  if (defined === undefined) {
    throw new ModelError(`the policy "${policy}" defines no hook "${name}"`);
  }
  if (defined.requests.length > 0) {
    throw new ModelError(
      `the hook "${name}" of "${policy}" requests what a hook called alone is not given`,
    );
  }
  await (script.kind === "workflow"
    ? workflowHookCalled(policy, script, witness, hook, lent)
    : stepHookCalled(policy, script, witness, hook, lent));
}

async function stepHookCalled(
  policy: string,
  script: PolicyScript,
  witness: Witness,
  hook: Hook,
  { contributor, reporter }: HookLent,
): Promise<unknown> {
  const called = new (stepPolicyClass(
    policy,
    script,
    stepEndingsOf(script),
    witness,
  ))();
  switch (hook) {
    case StepHook.OnStepSuccess:
      return called.onStepSuccess(contributor, reporter);
    case StepHook.OnStepFailure:
      return called.onStepFailure(contributor, reporter);
    case StepHook.OnStepRetry:
      return called.onStepRetry(contributor, reporter);
    case StepHook.OnStepAbnormalTermination:
      return called.onStepAbnormalTermination(contributor, reporter);
    case WorkflowHook.OnWorkflowSuccess:
    case WorkflowHook.OnWorkflowFailure:
      throw new ModelError(`the step policy "${policy}" defines ${hook}`);
  }
}

async function workflowHookCalled(
  policy: string,
  script: PolicyScript,
  witness: Witness,
  hook: Hook,
  { contributor, reporter }: HookLent,
): Promise<unknown> {
  const called = new (workflowPolicyClass(
    policy,
    script,
    workflowEndingsOf(script),
    witness,
  ))();
  switch (hook) {
    case WorkflowHook.OnWorkflowSuccess:
      return called.onWorkflowSuccess(contributor, reporter);
    case WorkflowHook.OnWorkflowFailure:
      return called.onWorkflowFailure(contributor, reporter);
    case StepHook.OnStepSuccess:
    case StepHook.OnStepFailure:
    case StepHook.OnStepRetry:
    case StepHook.OnStepAbnormalTermination:
      throw new ModelError(`the workflow policy "${policy}" defines ${hook}`);
  }
}
