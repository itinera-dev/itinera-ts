import type { Request } from "../declaration/request.js";
import type { PolicyName, StepHook, WorkflowHook } from "../policy.js";
import type { Hook } from "./hooks.js";
import type { StepPolicy, StepPolicyClass } from "./step-policy.js";
import type { WorkflowPolicy, WorkflowPolicyClass } from "./workflow-policy.js";

let describing: (policy: PolicyClass, parts: Parts) => PolicyDescriptor;
let partsOf: (described: PolicyDescriptor) => Parts;

/**
 * How a workflow describes one of its policies to the executor: its name,
 * the hooks it defines, and how to build an instance of it. The executor
 * reads it and never anything else about the policy.
 *
 * Only itinera makes one, for each policy declared with `@stepPolicy` or
 * `@workflowPolicy`, or put together with a policy's builder: an object
 * written by hand, with the same members, is not a policy descriptor and
 * does not compile where one is expected.
 *
 * {@includeCode ../../examples/policy-builder.ts}
 */
export class PolicyDescriptor {
  static {
    describing = (policy, parts) => new PolicyDescriptor(policy, parts);
    partsOf = (described) => described.#parts;
  }

  /** The policy's name, which events and the listing carry. */
  readonly name: PolicyName;
  readonly #policy: PolicyClass;
  readonly #parts: Parts;
  readonly #hooks: readonly Hook[];

  private constructor(policy: PolicyClass, parts: Parts) {
    this.name = parts.name;
    this.#policy = policy;
    this.#parts = parts;
    this.#hooks = Object.freeze([...parts.hooks.keys()]);
    Object.freeze(this);
  }

  /** The hooks the policy defines, in the order they were declared. */
  hooks(): readonly (StepHook | WorkflowHook)[] {
    return this.#hooks;
  }

  /**
   * Builds the policy, as a new object: for every attempt of a step policy's
   * step, or once per journey for a workflow policy.
   */
  build(): StepPolicy | WorkflowPolicy {
    return new this.#policy();
  }

  /**
   * Calls the hook `hook` on `policy`, an instance {@link PolicyDescriptor.build}
   * made: the method that implements it, with `answers`, what its requests
   * were answered with, in the order it declares them, and gives what the
   * method returns.
   *
   * {@includeCode ../../examples/policy-builder.ts}
   *
   * @throws TypeError if the policy does not define the hook.
   * @throws Whatever the hook throws.
   */
  call(
    policy: StepPolicy | WorkflowPolicy,
    hook: StepHook | WorkflowHook,
    answers: readonly unknown[],
  ): unknown {
    const declared = this.#parts.hooks.get(hook);
    const method: unknown =
      declared === undefined ? undefined : Reflect.get(policy, declared.key);
    if (typeof method !== "function") {
      throw new TypeError(`policy ${this.name} does not define ${hook}`);
    }
    return Reflect.apply(method, policy, answers);
  }
}

/** A class of policies of either kind. */
export type PolicyClass = StepPolicyClass | WorkflowPolicyClass;

/** Whether a policy is a step policy or a workflow policy. */
export type PolicyKind = "step" | "workflow";

/** One hook a policy defines: its method and the requests of its parameters. */
export interface DeclaredHook {
  /** The method that implements it. */
  readonly key: string | symbol;
  /** The requests of the method's parameters, in order. */
  readonly requests: readonly Request[];
}

/** What a policy descriptor is made from. */
interface Parts {
  readonly kind: PolicyKind;
  readonly name: PolicyName;
  readonly hooks: ReadonlyMap<Hook, DeclaredHook>;
}

/**
 * The descriptor of the policy class `policy`, a step policy or a workflow
 * policy as `kind` says, named `name`, with `hooks`.
 *
 * @throws Error if it defines no hook.
 */
export function describePolicy(
  policy: PolicyClass,
  kind: PolicyKind,
  name: PolicyName,
  hooks: ReadonlyMap<Hook, DeclaredHook>,
): PolicyDescriptor {
  if (hooks.size === 0) {
    throw new Error(`policy ${name} defines no hook`);
  }
  return describing(policy, { kind, name, hooks: new Map(hooks) });
}

/** Whether `described` is a step policy or a workflow policy. */
export function kindOf(described: PolicyDescriptor): PolicyKind {
  return partsOf(described).kind;
}

/** The method and requests of the hook `hook` of `described`, if it defines it. */
export function hookOf(
  described: PolicyDescriptor,
  hook: Hook,
): DeclaredHook | undefined {
  return partsOf(described).hooks.get(hook);
}
