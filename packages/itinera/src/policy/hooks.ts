import { type Owner, requireMetadata, where } from "../declaration.js";
import type { Request } from "../declaration/request.js";
import type { StepHook, WorkflowHook } from "../policy.js";
import type { DeclaredHook } from "./descriptor.js";
import type { OnFailure, OnSuccess } from "./lifecycle.js";
import type { StepPolicy } from "./step-policy.js";
import type { WorkflowPolicy } from "./workflow-policy.js";

/** A hook of either kind. */
export type Hook = StepHook | WorkflowHook;

const marked = new WeakMap<object, Map<Hook, string | symbol>>();

/**
 * The decorator a hook's decorator function makes, which TypeScript calls
 * once, with the method it marks, when the class is defined. It compiles only
 * on a method of a policy of type `P` that returns `R`, or a promise of it.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam R What the hook returns.
 * @typeParam P The kind of policy the hook belongs to.
 */
export interface HookDecorator<R, P> {
  /**
   * Marks the method `key` of a policy class, given its prototype.
   *
   * @typeParam M The type of the method.
   */
  <M extends (...requests: never[]) => R | Promise<R>>(
    prototype: P,
    key: string | symbol,
    method: TypedPropertyDescriptor<M>,
  ): void;
}

/**
 * Marks the method of a step policy that implements `on step success`,
 * called after an attempt reported Success. It returns `this.keepDefault()`,
 * `this.finishWorkflow()` or `this.failWorkflow(reason)`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, if the policy marks another
 * method with this hook, if the method is marked with another hook too, or
 * if the compiler option `emitDecoratorMetadata` is off.
 */
export function onStepSuccess(): HookDecorator<OnSuccess, StepPolicy> {
  return marking("on step success");
}

/**
 * Marks the method of a step policy that implements `on step failure`,
 * called once its step is given up and ends as failed. It returns
 * `this.keepDefault()` or `this.failWorkflow(reason)`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link onStepSuccess} does.
 */
export function onStepFailure(): HookDecorator<OnFailure, StepPolicy> {
  return marking("on step failure");
}

/**
 * Marks the method of a step policy that implements `on step retry`, called
 * before its step is attempted again. It returns `this.keepDefault()` or
 * `this.failWorkflow(reason)`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link onStepSuccess} does.
 */
export function onStepRetry(): HookDecorator<OnFailure, StepPolicy> {
  return marking("on step retry");
}

/**
 * Marks the method of a step policy that implements
 * `on step abnormal termination`, called after an attempt ended in an
 * abnormal termination. It returns `this.keepDefault()` or
 * `this.failWorkflow(reason)`.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link onStepSuccess} does.
 */
export function onStepAbnormalTermination(): HookDecorator<
  OnFailure,
  StepPolicy
> {
  return marking("on step abnormal termination");
}

/**
 * Marks the method of a workflow policy that implements
 * `on workflow success`, called once the journey succeeded. It returns
 * nothing.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link onStepSuccess} does.
 */
export function onWorkflowSuccess(): HookDecorator<void, WorkflowPolicy> {
  return marking("on workflow success");
}

/**
 * Marks the method of a workflow policy that implements
 * `on workflow failure`, called once the journey failed. It returns nothing.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @throws Error, when the class is defined, as {@link onStepSuccess} does.
 */
export function onWorkflowFailure(): HookDecorator<void, WorkflowPolicy> {
  return marking("on workflow failure");
}

/** The hooks the methods of the policy class `owner` are marked with. */
export function hooksOf(owner: object): ReadonlyMap<Hook, string | symbol> {
  return marked.get(owner) ?? new Map<Hook, string | symbol>();
}

function marking<R, P extends object>(hook: Hook): HookDecorator<R, P> {
  return (prototype, key) => {
    requireMetadata(prototype, key);
    const owner = prototype.constructor;
    const hooks = marked.get(owner) ?? new Map<Hook, string | symbol>();
    marked.set(owner, hooks);
    const earlier = hooks.get(hook);
    if (earlier !== undefined) {
      throw new Error(
        `${owner.name} defines ${hook} twice, on ${String(earlier)} and on ${String(key)}`,
      );
    }
    if ([...hooks.values()].includes(key)) {
      throw new Error(`${where(owner, key)} is marked with two hooks`);
    }
    hooks.set(hook, key);
  };
}

const causes: Partial<Record<Request["kind"], Cause>> = {
  failureCause: { name: "the failure cause", hook: "on step failure" },
  retryCause: { name: "the retry cause", hook: "on step retry" },
};

interface Cause {
  readonly name: string;
  readonly hook: Hook;
}

/**
 * The hook `hook` of the policy class `target`, implemented by its method
 * `key`, whose parameters make `requests`.
 *
 * @throws Error if it requests a cause it is not given: the failure cause
 * outside `on step failure`, or the retry cause outside `on step retry`.
 */
export function checkedHook(
  target: Owner,
  hook: Hook,
  key: string | symbol,
  requests: readonly Request[],
): DeclaredHook {
  const cause = requests.map(causeOf).find((found) => isMisplaced(found, hook));
  if (cause !== undefined) {
    throw new Error(
      `${where(target, key)} requests ${cause.name}, which only ${cause.hook} is given`,
    );
  }
  return { key, requests };
}

function causeOf(request: Request): Cause | undefined {
  return causes[request.kind];
}

function isMisplaced(cause: Cause | undefined, hook: Hook): boolean {
  return cause !== undefined && cause.hook !== hook;
}
