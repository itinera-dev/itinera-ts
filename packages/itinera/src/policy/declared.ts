import {
  methodsWithRequests,
  type Owner,
  requestsOf,
  where,
} from "../declaration.js";
import type { Request } from "../declaration/request.js";
import { named } from "../name.js";
import type { PolicyName } from "../policy.js";
import { type Hook, hooksOf } from "./hooks.js";
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

/**
 * What a policy class declared: its kind, its name, and its hooks with their
 * requests.
 */
export interface PolicyDeclaration {
  /** Whether it is a step policy or a workflow policy. */
  readonly kind: "step" | "workflow";
  /** The policy's name. */
  readonly name: PolicyName;
  /** Each hook the policy defines, with its method and its requests. */
  readonly hooks: ReadonlyMap<Hook, DeclaredHook>;
}

/** One hook a policy defines. */
export interface DeclaredHook {
  /** The method that implements it. */
  readonly key: string | symbol;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly Request[];
}

const declared = new WeakMap<object, PolicyDeclaration>();

const causes: Partial<Record<Request["kind"], Cause>> = {
  failureCause: { name: "the failure cause", hook: "on step failure" },
  retryCause: { name: "the retry cause", hook: "on step retry" },
};

interface Cause {
  readonly name: string;
  readonly hook: Hook;
}

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

/** What the policy class `target` declared, if it was declared. */
export function declarationOfPolicy(
  target: object,
): PolicyDeclaration | undefined {
  return declared.get(target);
}

const bases: Readonly<Record<PolicyDeclaration["kind"], Owner>> = {
  step: StepPolicy,
  workflow: WorkflowPolicy,
};

function declare(
  target: Owner,
  kind: PolicyDeclaration["kind"],
  options: PolicyOptions,
): void {
  const base = bases[kind];
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
  if (hooks.size === 0) {
    throw new Error(`policy ${name} defines no hook`);
  }
  const unmarked = methodsWithRequests(target).find((key) =>
    isUnmarked(key, hooks),
  );
  if (unmarked !== undefined) {
    throw new Error(
      `${where(target, unmarked)} carries requests, but is marked with no hook`,
    );
  }
  declared.set(target, {
    kind,
    name,
    hooks: new Map([...hooks].map((hook) => declaredHook(target, hook))),
  });
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
  const requests = requestsOf(target, key);
  const cause = requests.map(causeOf).find((found) => isMisplaced(found, hook));
  if (cause !== undefined) {
    throw new Error(
      `${where(target, key)} requests ${cause.name}, which only ${cause.hook} is given`,
    );
  }
  return [hook, { key, requests }];
}

function causeOf(request: Request): Cause | undefined {
  return causes[request.kind];
}

function isMisplaced(cause: Cause | undefined, hook: Hook): boolean {
  return cause !== undefined && cause.hook !== hook;
}
