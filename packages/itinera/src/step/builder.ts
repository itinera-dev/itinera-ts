import { requestsOf } from "../declaration.js";
import { requestsGiven } from "../declaration/marking.js";
import type { Place } from "../declaration/parameter.js";
import type { Tokens } from "../declaration/token.js";
import type { Request } from "../declaration/request.js";
import { named } from "../name.js";
import type { RolesOfOne, StepPolicyClass } from "../policy.js";
import {
  type StepPolicyBuilder,
  stepPolicyGiven,
} from "../policy/step-policy/builder.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { StepClass, StepDescriptor, StepName } from "../step.js";
import type { StepRequests } from "./declared.js";
import { checkedRetryBudget, describeStep, type Rescue } from "./descriptor.js";
import type { RescueStepClass } from "./rescue.js";
import { type RescueStepBuilder, rescueGiven } from "./rescue/builder.js";

let starting: <C extends StepClass>(step: C, name: StepName) => StepBuilder<C>;
let describing: <C extends StepClass, R>(
  builder: StepBuilder<C, R>,
) => StepDescriptor;

/**
 * Puts one step of the class `C` together for a workflow's builder: what
 * `@withStep` says about a step, one method at a time, started by the step
 * class's static `builder(name)`. Each method checks what it is given at
 * once and returns the builder, which the workflow's builder takes in its
 * `step`.
 *
 * A step class declared without decorators is given its requests by
 * position, with `needs` and `run`.
 *
 * {@includeCode ../../examples/builder.ts}
 *
 * @typeParam C The class of the step.
 * @typeParam R The roles its step policies request, which the workflow must
 * implement.
 */
export class StepBuilder<C extends StepClass, R = unknown> {
  static {
    starting = (step, name) => new StepBuilder(step, name);
    describing = (builder) => builder.#describe();
  }

  declare private readonly roles: (provided: R) => void;
  readonly #step: C;
  readonly #name: StepName;
  #retryBudget = 0;
  #noRetryOnAbnormalTermination = false;
  #needs: readonly Request[] | undefined;
  #run: readonly Request[] | undefined;
  readonly #policies: PolicyDescriptor[] = [];
  #rescue: Omit<Rescue, "name"> | undefined;

  private constructor(step: C, name: StepName) {
    this.#step = step;
    this.#name = name;
  }

  /**
   * How many times the step may be retried after its first attempt, a whole
   * number from 0: 0 unless this says otherwise.
   *
   * @throws Error if `retries` is not a whole number from 0.
   */
  retryBudget(retries: number): this {
    this.#retryBudget = checkedRetryBudget(this.#name, retries);
    return this;
  }

  /**
   * Never retries an attempt that ends in an abnormal termination, whatever
   * the retry budget.
   */
  noRetryOnAbnormalTermination(): this {
    this.#noRetryOnAbnormalTermination = true;
    return this;
  }

  /**
   * The requests of the step's constructor, one per parameter in order,
   * such as `input("amount", integer)`, each with its type written, for a
   * step class declared without decorators.
   *
   * {@includeCode ../../examples/tokens-by-position.ts}
   *
   * @throws Error if the class declares its requests with decorators, or if
   * a parameter is left without a request.
   */
  needs(
    ...requests: Tokens<ConstructorParameters<C>, Place<C, undefined>>
  ): this {
    this.#needs = requestsGiven(this.#step, undefined, requests);
    return this;
  }

  /**
   * The requests of the step's `run`, one per parameter in order, such as
   * `service("payments", PAYMENTS)` or `contributor()`, for a step class
   * declared without decorators.
   *
   * {@includeCode ../../examples/tokens-by-position.ts}
   *
   * @throws Error if the class declares its requests with decorators, or if
   * a parameter is left without a request.
   */
  run(
    ...requests: Tokens<
      Parameters<InstanceType<C>["run"]>,
      Place<InstanceType<C>, "run">
    >
  ): this {
    this.#run = requestsGiven(this.#step, "run", requests);
    return this;
  }

  /**
   * Attaches a step policy, after those attached so far: a class declared
   * with `@stepPolicy`, or a policy's builder. The workflow must implement
   * the roles it requests.
   *
   * It returns a new builder, which carries the roles the policy requests,
   * and leaves this one as it was, so that no builder can reach the
   * workflow's builder without the roles of its policies.
   *
   * {@includeCode ../../examples/policy-builder.ts}
   *
   * @throws Error if the class is not declared with `@stepPolicy`, or if the
   * policy's builder was given no hook.
   */
  policy<P extends StepPolicyClass>(
    policy: P | StepPolicyBuilder<P>,
  ): StepBuilder<C, R & RolesOfOne<P>> {
    const next = new StepBuilder<C, R & RolesOfOne<P>>(this.#step, this.#name);
    next.#retryBudget = this.#retryBudget;
    next.#noRetryOnAbnormalTermination = this.#noRetryOnAbnormalTermination;
    next.#needs = this.#needs;
    next.#run = this.#run;
    next.#policies.push(...this.#policies, stepPolicyGiven(policy));
    next.#rescue = this.#rescue;
    return next;
  }

  /**
   * Gives the step a rescue step, which runs as `<step name>_rescue` before
   * the step runs again after an attempt that failed: a class declared with
   * `@rescueStep`, or a rescue step's builder.
   *
   * {@includeCode ../../examples/rescue-step.ts}
   *
   * @throws Error if the class is not declared with `@rescueStep`.
   */
  rescue<Q extends RescueStepClass>(rescue: Q | RescueStepBuilder<Q>): this {
    this.#rescue = rescueGiven(rescue);
    return this;
  }

  #describe(): StepDescriptor {
    return describeStep(this.#step, {
      name: this.#name,
      retryBudget: this.#retryBudget,
      noRetryOnAbnormalTermination: this.#noRetryOnAbnormalTermination,
      policies: this.#policies,
      rescue: this.#rescue,
      requests: this.#requests(),
    });
  }

  #requests(): StepRequests {
    return {
      needs: this.#needs ?? requestsOf(this.#step, undefined),
      run: this.#run ?? requestsOf(this.#step, "run"),
    };
  }
}

/**
 * The builder of a step of the class `step`, named `name`.
 *
 * @throws Error if the name is empty.
 */
export function stepBuilder<C extends StepClass>(
  step: C,
  name: string,
): StepBuilder<C> {
  const checked = named<StepName>(name, `a step of class ${step.name}`);
  return starting(step, checked);
}

/**
 * The descriptor of the step `builder` has put together so far.
 *
 * @throws Error if a parameter of the step's constructor or of its `run` has
 * no request.
 */
export function describedBy<C extends StepClass, R>(
  builder: StepBuilder<C, R>,
): StepDescriptor {
  return describing(builder);
}
