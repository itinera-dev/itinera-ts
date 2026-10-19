import { type PolicyName, StepHook, WorkflowHook } from "../../policy.js";
import type { PolicyDescriptor } from "../../policy/descriptor.js";
import type { StepDescriptor, StepName } from "../../step.js";
import type { ViolationKind } from "../violation.js";
import { grouped, repeated } from "./tally.js";

/**
 * Two step policies attached to one step define the same step hook.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface StepHookDefinedTwice {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.HookDefinedTwice;
  /** The step the policies are attached to. */
  readonly step: StepName;
  /** The hook they define. */
  readonly hook: StepHook;
  /** The policies that define it, in the order they are attached. */
  readonly policies: readonly PolicyName[];
}

/**
 * Two workflow policies attached to the workflow define the same workflow
 * hook.
 *
 * {@includeCode ../../../examples/violations.ts}
 */
export interface WorkflowHookDefinedTwice {
  /** Tells this violation from the others. */
  readonly kind: typeof ViolationKind.HookDefinedTwice;
  /** The hook they define. */
  readonly hook: WorkflowHook;
  /** The policies that define it, in the order they are attached. */
  readonly policies: readonly PolicyName[];
}

/** One hook a policy defines. */
interface Definition<H> {
  readonly hook: H;
  readonly policy: PolicyName;
}

/** The step hooks that more than one policy attached to `step` defines. */
export function stepHooksDefinedTwice(
  step: StepDescriptor,
): StepHookDefinedTwice[] {
  return grouped(step.policies().flatMap(stepHookDefinitions), hookOf)
    .filter(repeated)
    .map((group) => stepHookDefinedTwice(step.name, group));
}

/** The workflow hooks that more than one of `policies` defines. */
export function workflowHooksDefinedTwice(
  policies: readonly PolicyDescriptor[],
): WorkflowHookDefinedTwice[] {
  return grouped(policies.flatMap(workflowHookDefinitions), hookOf)
    .filter(repeated)
    .map(workflowHookDefinedTwice);
}

function stepHookDefinitions(
  policy: PolicyDescriptor,
): readonly Definition<StepHook>[] {
  return policy
    .hooks()
    .filter(StepHook.has)
    .map((hook) => definedBy(hook, policy.name));
}

function workflowHookDefinitions(
  policy: PolicyDescriptor,
): readonly Definition<WorkflowHook>[] {
  return policy
    .hooks()
    .filter(WorkflowHook.has)
    .map((hook) => definedBy(hook, policy.name));
}

function definedBy<H>(hook: H, policy: PolicyName): Definition<H> {
  return { hook, policy };
}

function hookOf<H extends string>(definition: Definition<H>): string {
  return definition.hook;
}

function policyOf<H>(definition: Definition<H>): PolicyName {
  return definition.policy;
}

function stepHookDefinedTwice(
  step: StepName,
  group: readonly [Definition<StepHook>, ...Definition<StepHook>[]],
): StepHookDefinedTwice {
  return {
    kind: "hook defined twice",
    step,
    hook: group[0].hook,
    policies: group.map(policyOf),
  };
}

function workflowHookDefinedTwice(
  group: readonly [Definition<WorkflowHook>, ...Definition<WorkflowHook>[]],
): WorkflowHookDefinedTwice {
  return {
    kind: "hook defined twice",
    hook: group[0].hook,
    policies: group.map(policyOf),
  };
}
