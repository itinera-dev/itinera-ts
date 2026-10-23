import type { Place } from "../../declaration/parameter.js";
import type {
  MethodKey,
  ParametersOf,
  Tokens,
} from "../../declaration/token.js";
import type { PolicyName } from "../../policy.js";
import { checkedName, Hooks } from "../builder.js";
import { declaredPolicy } from "../declared.js";
import type { PolicyDescriptor } from "../descriptor.js";
import type { WorkflowPolicyClass } from "../workflow-policy.js";

let starting: <C extends WorkflowPolicyClass>(
  policy: C,
  name: PolicyName,
) => WorkflowPolicyBuilder<C>;
let hooksOf: <C extends WorkflowPolicyClass>(
  builder: WorkflowPolicyBuilder<C>,
) => Hooks;

/**
 * Puts a workflow policy of the class `C` together for a workflow's
 * builder, which takes it in its `policy`: started by the policy class's
 * static `builder(name)`, for a class declared without decorators. Each
 * method names the method of the class that implements a hook, and gives
 * the requests of its parameters by position.
 *
 * {@includeCode ../../../examples/policy-builder.ts}
 *
 * @typeParam C The class of the policy.
 */
export class WorkflowPolicyBuilder<C extends WorkflowPolicyClass> {
  static {
    starting = (policy, name) => new WorkflowPolicyBuilder(policy, name);
    hooksOf = (builder) => builder.#hooks;
  }

  readonly #hooks: Hooks;

  private constructor(policy: C, name: PolicyName) {
    this.#hooks = new Hooks(policy, "workflow", name);
  }

  /**
   * Makes the method `key` the policy's `on workflow success`, its
   * parameters making `requests`, in order.
   *
   * @throws Error, at once, as {@link StepPolicyBuilder.onStepFailure} does.
   */
  onWorkflowSuccess<K extends MethodKey<InstanceType<C>, void>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on workflow success", key, requests);
    return this;
  }

  /**
   * Makes the method `key` the policy's `on workflow failure`, its
   * parameters making `requests`, in order.
   *
   * @throws Error, at once, as {@link StepPolicyBuilder.onStepFailure} does.
   */
  onWorkflowFailure<K extends MethodKey<InstanceType<C>, void>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on workflow failure", key, requests);
    return this;
  }
}

/**
 * The builder of a workflow policy of the class `policy`, named `name`, or
 * else after its class.
 *
 * @throws Error if the name is empty, or if the class is declared with a
 * policy's decorator.
 */
export function workflowPolicyBuilder<C extends WorkflowPolicyClass>(
  policy: C,
  name: string | undefined,
): WorkflowPolicyBuilder<C> {
  return starting(policy, checkedName(policy, "workflow", name));
}

/**
 * The descriptor of the workflow policy `policy` gives a workflow: a class
 * declared with `@workflowPolicy`, or what a workflow policy's builder has
 * put together.
 *
 * @throws Error if the class is not declared with `@workflowPolicy`, or if
 * the builder was given no hook.
 */
export function workflowPolicyGiven<P extends WorkflowPolicyClass>(
  policy: P | WorkflowPolicyBuilder<P>,
): PolicyDescriptor {
  return policy instanceof WorkflowPolicyBuilder
    ? hooksOf(policy).describe()
    : declaredPolicy(policy, "workflow");
}
