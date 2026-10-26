import {
  methodsWithRequests,
  type Owner,
  requestsOf,
  where,
} from "../declaration.js";
import { named } from "../name.js";
import type { PolicyName } from "../policy.js";
import {
  type DeclaredHook,
  describePolicy,
  kindOf,
  type PolicyClass,
  type PolicyDescriptor,
  type PolicyKind,
} from "./descriptor.js";
import { checkedHook, type Hook, hooksOf } from "./hooks.js";
import { StepPolicy } from "./step-policy.js";
import { WorkflowPolicy } from "./workflow-policy.js";

/**
 * What `@stepPolicy` and `@workflowPolicy` say about a policy.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export interface PolicyOptions {
  /**
   * The policy's name, which events and the listing carry: the class's name
   * when not given. Name it when the code may be minified, since minifiers
   * rename classes.
   */
  readonly name?: string;
}

const declared = new WeakMap<object, PolicyDescriptor>();

/**
 * Declares a step policy: a class extending {@link StepPolicy} directly,
 * whose hooks are its methods marked with the step hooks' decorators, such
 * as `@onStepSuccess()`. A step lists it in the `policies` of its
 * `@withStep`, which accepts only a class declared with `@stepPolicy`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, if it does not extend
 * `StepPolicy` itself, if it is declared twice, if its name is empty, if it
 * defines no hook, if a method carries requests but no hook, if a parameter
 * of a hook has no request, or if a hook requests a cause it is not given:
 * the failure cause outside `on step failure`, or the retry cause outside
 * `on step retry`.
 */
export function stepPolicy(
  options: PolicyOptions = {},
): (target: new () => StepPolicy) => void {
  return (target) => {
    declare(target, "step", options);
  };
}

/**
 * Declares a workflow policy: a class extending {@link WorkflowPolicy}
 * directly, whose hooks are its methods marked with `@onWorkflowSuccess()`
 * or `@onWorkflowFailure()`. A workflow lists it in the `policies` of its
 * `@workflow`, which accepts only a class declared with `@workflowPolicy`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link stepPolicy} does.
 */
export function workflowPolicy(
  options: PolicyOptions = {},
): (target: new () => WorkflowPolicy) => void {
  return (target) => {
    declare(target, "workflow", options);
  };
}

/**
 * The descriptor of the policy class `target`, declared with `@stepPolicy`
 * or `@workflowPolicy` as `kind` says.
 *
 * @throws Error if it is not declared with that decorator.
 */
export function declaredPolicy(
  target: { readonly name: string },
  kind: PolicyKind,
): PolicyDescriptor {
  const described = declared.get(target);
  if (described === undefined || kindOf(described) !== kind) {
    throw new Error(`${target.name} is not declared with @${kind}Policy`);
  }
  return described;
}

/** Whether `target` was declared with `@stepPolicy` or `@workflowPolicy`. */
export function isDeclaredPolicy(target: object): boolean {
  return declared.has(target);
}

function baseOf(kind: PolicyKind): Owner {
  return kind === "step" ? StepPolicy : WorkflowPolicy;
}

function declare(
  target: PolicyClass,
  kind: PolicyKind,
  options: PolicyOptions,
): void {
  const base = baseOf(kind);
  if (Object.getPrototypeOf(target) !== base) {
    throw new Error(`${target.name} must extend ${base.name} itself`);
  }
  if (declared.has(target)) {
    throw new Error(`${target.name} is declared as a policy twice`);
  }
  const name = named<PolicyName>(
    options.name ?? target.name,
    `policy class ${target.name}`,
  );
  const hooks = hooksOf(target);
  const unmarked = methodsWithRequests(target).find((key) =>
    isUnmarked(key, hooks),
  );
  if (unmarked !== undefined) {
    throw new Error(
      `${where(target, unmarked)} carries requests, but is marked with no hook`,
    );
  }
  declared.set(
    target,
    describePolicy(
      target,
      kind,
      name,
      new Map([...hooks].map((hook) => declaredHook(target, hook))),
    ),
  );
}

function isUnmarked(
  key: string | symbol,
  hooks: ReadonlyMap<Hook, string | symbol>,
): boolean {
  return ![...hooks.values()].includes(key);
}

function declaredHook(
  target: Owner,
  [hook, key]: readonly [Hook, string | symbol],
): [Hook, DeclaredHook] {
  return [hook, checkedHook(target, hook, key, requestsOf(target, key))];
}
