import { requestsOf } from "../declaration.js";
import type { Request } from "../declaration/request.js";
import {
  refuseStaticData,
  type WithoutStaticData,
} from "../declaration/static-data.js";
import { Step, type StepClass } from "../step.js";

/** What a step requests: its needs, given to its constructor, then what its `run` takes. */
export interface StepRequests {
  /** The requests of the constructor's parameters, in order. */
  readonly needs: readonly Request[];
  /** The requests of the parameters of `run`, in order. */
  readonly run: readonly Request[];
}

const declared = new WeakMap<StepClass, StepRequests>();

/**
 * Declares a step: a class extending {@link Step} directly, whose `run`
 * makes its outcome. A workflow lists it with `@withStep`, which accepts only
 * a class declared with `@step`.
 *
 * Every parameter of the step's constructor and of its `run` is a request,
 * marked with the decorator of what it requests: `@input` on the
 * constructor's, `@service`, `@contributor` and `@stepReporter` on those of
 * `run`.
 *
 * {@includeCode ../../examples/step.ts}
 *
 * A step keeps no static data, which every attempt of every journey would
 * share: a public static property holding anything but a function does not
 * compile, and a `protected` or `private` one, or an accessor, is refused when
 * the class is defined, as {@link WithoutStaticData} says.
 *
 * @throws Error, when the class is defined, if it does not extend `Step`
 * itself, if it keeps static data, if it is declared twice, or if a
 * parameter has no request.
 */
export function step(): <C extends StepClass>(
  target: WithoutStaticData<C, typeof Step>,
) => void {
  return (target) => {
    if (Object.getPrototypeOf(target) !== Step) {
      throw new Error(`${target.name} must extend Step itself`);
    }
    refuseStaticData(target, Step, "step");
    if (declared.has(target)) {
      throw new Error(`${target.name} is declared with @step twice`);
    }
    declared.set(target, requestsOfStep(target));
  };
}

/**
 * What the step class `target` requests: what `@step` recorded, or else what
 * the decorators of its parameters recorded.
 *
 * @throws Error if a parameter of its constructor or of its `run` has no
 * request.
 */
export function requestsOfStep(target: StepClass): StepRequests {
  return (
    declared.get(target) ?? {
      needs: requestsOf(target, undefined),
      run: requestsOf(target, "run"),
    }
  );
}

/** Whether `target` was declared with {@link step}. */
export function isDeclared(target: StepClass): boolean {
  return declared.has(target);
}
