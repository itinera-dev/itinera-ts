import { named } from "../name.js";
import type { StepClass, StepDescriptor, StepName } from "../step.js";
import { requestsOfStep } from "./declared.js";
import { checkedRetryBudget, describeStep } from "./descriptor.js";

let starting: (step: StepClass, name: StepName) => StepBuilder;
let describing: (builder: StepBuilder) => StepDescriptor;

/**
 * Puts one step together for a workflow's builder: what `@withStep` says
 * about a step, one method at a time, started by the step class's static
 * `builder(name)`. Each method checks what it is given at once and returns
 * the builder, which the workflow's builder takes in its `step`.
 *
 * {@includeCode ../../examples/builder.ts}
 */
export class StepBuilder {
  static {
    starting = (step, name) => new StepBuilder(step, name);
    describing = (builder) => builder.#describe();
  }

  readonly #step: StepClass;
  readonly #name: StepName;
  #retryBudget = 0;
  #noRetryOnAbnormalTermination = false;

  private constructor(step: StepClass, name: StepName) {
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

  #describe(): StepDescriptor {
    return describeStep(this.#step, {
      name: this.#name,
      retryBudget: this.#retryBudget,
      noRetryOnAbnormalTermination: this.#noRetryOnAbnormalTermination,
    });
  }
}

/**
 * The builder of a step of the class `step`, named `name`.
 *
 * @throws Error if the name is empty, or if a parameter of the step's
 * constructor or of its `run` has no request.
 */
export function stepBuilder(step: StepClass, name: string): StepBuilder {
  const checked = named<StepName>(name, `a step of class ${step.name}`);
  requestsOfStep(step);
  return starting(step, checked);
}

/** The descriptor of the step `builder` has put together so far. */
export function describedBy(builder: StepBuilder): StepDescriptor {
  return describing(builder);
}
