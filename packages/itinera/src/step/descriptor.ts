import { named } from "../name.js";
import type { StepPolicyClass } from "../policy.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { Step, StepClass, StepName } from "../step.js";
import { requestsOfStep, type StepRequests } from "./declared.js";
import type { RescueStepClass } from "./rescue.js";

let describing: (step: StepClass, parts: Parts) => StepDescriptor;
let partsOf: (described: StepDescriptor) => Parts;

/**
 * How a workflow describes one of its steps to the executor: its name, its
 * retries, its step policies, and how to build it for an attempt. The
 * executor reads it and never anything else about the step.
 *
 * Only itinera makes one, for each step a workflow lists with `@withStep` or
 * its builder: an object written by hand, with the same members, is not a
 * step descriptor and does not compile where one is expected.
 *
 * {@includeCode ../../examples/descriptors.ts}
 */
export class StepDescriptor {
  static {
    describing = (step, parts) => new StepDescriptor(step, parts);
    partsOf = (described) => described.#parts;
  }

  /** The step's name, unique in its workflow. */
  readonly name: StepName;
  /**
   * How many times the step may be retried after its first attempt: 0 when
   * the workflow says nothing.
   */
  readonly retryBudget: number;
  /**
   * Whether an attempt that ends in an abnormal termination is retried while
   * the retry budget lasts: `true` when the workflow says nothing.
   */
  readonly retryOnAbnormalTermination: boolean;
  readonly #step: StepClass;
  readonly #parts: Parts;

  private constructor(step: StepClass, parts: Parts) {
    this.name = parts.name;
    this.retryBudget = parts.retryBudget;
    this.retryOnAbnormalTermination = parts.retryOnAbnormalTermination;
    this.#step = step;
    this.#parts = parts;
    Object.freeze(this);
  }

  /**
   * The step policies attached to the step, in the order their hooks are
   * looked up.
   */
  policies(): readonly PolicyDescriptor[] {
    return this.#parts.policies;
  }

  /**
   * Builds the step for one attempt, as a new object, giving its
   * constructor `needs`, what its constructor's requests were answered
   * with, in order.
   *
   * @throws Whatever the step's constructor throws.
   */
  build(needs: readonly unknown[] = []): Step {
    return new this.#step(...(needs as never[]));
  }
}

/**
 * What a workflow says about one of its steps to `@withStep`; its builder
 * takes a step builder instead.
 *
 * {@includeCode ../../examples/descriptors.ts}
 *
 * @typeParam P The step policies attached to the step, as a list written in
 * place.
 */
export interface StepOptions<
  P extends readonly StepPolicyClass[] = readonly [],
> {
  /** The step's name: not empty, and unique in its workflow. */
  readonly name: string;
  /**
   * How many times the step may be retried after its first attempt, a whole
   * number from 0: 0 when not given.
   */
  readonly retryBudget?: number;
  /**
   * `true` to never retry an attempt that ends in an abnormal termination,
   * whatever the retry budget.
   */
  readonly noRetryOnAbnormalTermination?: boolean;
  /**
   * The step policies attached to the step, in the order their hooks are
   * looked up, each declared with `@stepPolicy`. The workflow must implement
   * the roles each of them requests.
   */
  readonly policies?: P;
  /**
   * The rescue step that runs, as `<step name>_rescue`, before the step runs
   * again after an attempt that failed, declared with `@rescueStep`.
   */
  readonly rescue?: RescueStepClass;
}

/**
 * A rescue step attached to a step: its name, `<step name>_rescue`, its
 * class, and its requests.
 */
export interface Rescue {
  /** The rescue step's name. */
  readonly name: StepName;
  /** The class built for its attempt. */
  readonly step: RescueStepClass;
  /** What it requests. */
  readonly requests: StepRequests;
}

/** What a step descriptor is made from, as its builder or `@withStep` says. */
export interface Described {
  /** The step's name, not yet checked. */
  readonly name: string;
  /** The retry budget, not yet checked: 0 when not given. */
  readonly retryBudget?: number;
  /** `true` to never retry an abnormal termination. */
  readonly noRetryOnAbnormalTermination?: boolean;
  /** The step policies attached, in order: none when not given. */
  readonly policies?: readonly PolicyDescriptor[];
  /** The rescue step's class and requests, if it has one. */
  readonly rescue?: Omit<Rescue, "name"> | undefined;
  /** What the step requests: what its decorators declared when not given. */
  readonly requests?: StepRequests;
}

/** What a step descriptor is made from, once checked. */
interface Parts {
  readonly name: StepName;
  readonly retryBudget: number;
  readonly retryOnAbnormalTermination: boolean;
  readonly policies: readonly PolicyDescriptor[];
  readonly rescue: Rescue | undefined;
  readonly requests: StepRequests;
}

/**
 * The descriptor of the step `step`, as `described` says.
 *
 * @throws Error if the name is empty, or the retry budget is not a whole
 * number from 0.
 */
export function describeStep(
  step: StepClass,
  described: Described,
): StepDescriptor {
  const name = named<StepName>(described.name, `a step of class ${step.name}`);
  const { rescue } = described;
  return describing(step, {
    name,
    retryBudget: checkedRetryBudget(name, described.retryBudget ?? 0),
    retryOnAbnormalTermination: described.noRetryOnAbnormalTermination !== true,
    policies: Object.freeze([...(described.policies ?? [])]),
    rescue:
      rescue === undefined
        ? undefined
        : Object.freeze({
            ...rescue,
            name: named<StepName>(`${name}_rescue`, "a rescue step"),
          }),
    requests: described.requests ?? requestsOfStep(step),
  });
}

/**
 * `retries`, the retry budget of the step `name`.
 *
 * @throws Error if it is not a whole number from 0.
 */
export function checkedRetryBudget(name: StepName, retries: number): number {
  if (!Number.isSafeInteger(retries) || retries < 0) {
    throw new Error(
      `step ${name} has a retry budget of ${String(retries)}, not a whole number from 0`,
    );
  }
  return retries;
}

/** The rescue step of the step `described`, if it has one. */
export function rescueOf(described: StepDescriptor): Rescue | undefined {
  return partsOf(described).rescue;
}

/** What the step `described` requests. */
export function requestsOfDescribed(described: StepDescriptor): StepRequests {
  return partsOf(described).requests;
}
