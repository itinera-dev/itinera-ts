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
import type { OnFailure, OnSuccess } from "../lifecycle.js";
import type { StepPolicyClass } from "../step-policy.js";

let starting: <C extends StepPolicyClass>(
  policy: C,
  name: PolicyName,
) => StepPolicyBuilder<C>;
let hooksOf: <C extends StepPolicyClass>(
  builder: StepPolicyBuilder<C>,
) => Hooks;

/**
 * Puts a step policy of the class `C` together for a step's builder, which
 * takes it in its `policy`: started by the policy class's static
 * `builder(name)`, for a class declared without decorators. Each method
 * names the method of the class that implements a hook, and gives the
 * requests of its parameters by position.
 *
 * {@includeCode ../../../examples/policy-builder.ts}
 *
 * @typeParam C The class of the policy.
 */
export class StepPolicyBuilder<C extends StepPolicyClass> {
  static {
    starting = (policy, name) => new StepPolicyBuilder(policy, name);
    hooksOf = (builder) => builder.#hooks;
  }

  readonly #hooks: Hooks;

  private constructor(policy: C, name: PolicyName) {
    this.#hooks = new Hooks(policy, "step", name);
  }

  /**
   * Makes the method `key` the policy's `on step success`, its parameters
   * making `requests`, in order.
   *
   * @throws Error, at once, as {@link StepPolicyBuilder.onStepFailure} does.
   */
  onStepSuccess<K extends MethodKey<InstanceType<C>, OnSuccess>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on step success", key, requests);
    return this;
  }

  /**
   * Makes the method `key` the policy's `on step failure`, its parameters
   * making `requests`, in order.
   *
   * @throws Error, at once, if `key` is not a method of the class, if it
   * implements another hook already, if the policy defines this hook
   * already, if a parameter is left without a request, or if the hook
   * requests a cause it is not given.
   */
  onStepFailure<K extends MethodKey<InstanceType<C>, OnFailure>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on step failure", key, requests);
    return this;
  }

  /**
   * Makes the method `key` the policy's `on step retry`, its parameters
   * making `requests`, in order.
   *
   * @throws Error, at once, as {@link StepPolicyBuilder.onStepFailure} does.
   */
  onStepRetry<K extends MethodKey<InstanceType<C>, OnFailure>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on step retry", key, requests);
    return this;
  }

  /**
   * Makes the method `key` the policy's `on step abnormal termination`, its
   * parameters making `requests`, in order.
   *
   * @throws Error, at once, as {@link StepPolicyBuilder.onStepFailure} does.
   */
  onStepAbnormalTermination<K extends MethodKey<InstanceType<C>, OnFailure>>(
    key: K,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#hooks.add("on step abnormal termination", key, requests);
    return this;
  }
}

/**
 * The builder of a step policy of the class `policy`, named `name`, or else
 * after its class.
 *
 * @throws Error if the name is empty, or if the class is declared with a
 * policy's decorator.
 */
export function stepPolicyBuilder<C extends StepPolicyClass>(
  policy: C,
  name: string | undefined,
): StepPolicyBuilder<C> {
  return starting(policy, checkedName(policy, "step", name));
}

/**
 * The descriptor of the step policy `policy` gives a step: a class declared
 * with `@stepPolicy`, or what a step policy's builder has put together.
 *
 * @throws Error if the class is not declared with `@stepPolicy`, or if the
 * builder was given no hook.
 */
export function stepPolicyGiven<P extends StepPolicyClass>(
  policy: P | StepPolicyBuilder<P>,
): PolicyDescriptor {
  return policy instanceof StepPolicyBuilder
    ? hooksOf(policy).describe()
    : declaredPolicy(policy, "step");
}
