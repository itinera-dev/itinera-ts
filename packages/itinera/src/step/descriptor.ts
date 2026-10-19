import { named } from "../name.js";
import type { StepPolicyClass } from "../policy.js";
import type { Step, StepClass, StepName } from "../step.js";
import type { RescueStepClass } from "./rescue.js";

/**
 * How a workflow describes one of its steps to the executor: its name, its
 * retries, and how to build it for an attempt. itinera makes one for each
 * step a workflow lists, with `@withStep` or its builder; the executor reads
 * it and never anything else about the step.
 *
 * {@includeCode ../../examples/descriptors.ts}
 */
export interface StepDescriptor {
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
  /** Builds the step for one attempt, as a new object. */
  build(): Step;
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

/** What a workflow attaches to one of its steps. */
interface Attached {
  readonly policies: readonly StepPolicyClass[];
  readonly rescue: RescueStepClass | undefined;
}

const attached = new WeakMap<StepDescriptor, Attached>();

/**
 * The descriptor of the step `step`, as `options` describe it.
 *
 * @throws Error if the name is empty, or the retry budget is not a whole
 * number from 0.
 */
export function describeStep(
  step: StepClass,
  options: StepOptions<readonly StepPolicyClass[]>,
): StepDescriptor {
  const name = named<StepName>(options.name, `a step of class ${step.name}`);
  const retryBudget = checkedRetryBudget(name, options.retryBudget ?? 0);
  const described: StepDescriptor = Object.freeze({
    name,
    retryBudget,
    retryOnAbnormalTermination: options.noRetryOnAbnormalTermination !== true,
    build: () => new step(),
  });
  attached.set(described, {
    policies: Object.freeze([...(options.policies ?? [])]),
    rescue: options.rescue,
  });
  return described;
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

/** The classes of the step policies attached to the step `described`. */
export function policiesOf(
  described: StepDescriptor,
): readonly StepPolicyClass[] {
  return attached.get(described)?.policies ?? [];
}

/** The class of the rescue step of the step `described`, if it has one. */
export function rescueOf(
  described: StepDescriptor,
): RescueStepClass | undefined {
  return attached.get(described)?.rescue;
}
