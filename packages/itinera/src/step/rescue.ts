import { checkedOf, marking, requestsOf } from "../declaration.js";
import type { Place, ValueRequestDecorator } from "../declaration/parameter.js";
import type { RequestType } from "../value/token.js";
import { success, type Success } from "./outcome.js";
import type { StepRequests } from "./declared.js";

/**
 * What one attempt of a rescue step reports when it ends normally: never a
 * skip, which a rescue step cannot report. It makes it with the helpers of
 * its base class, such as `this.succeed()`, and reports anything abnormal by
 * throwing instead.
 *
 * {@includeCode ../../examples/rescue-step.ts}
 */
export type RescueOutcome = Success;

/**
 * The base class of every rescue step: the step a workflow runs, as
 * `<step name>_rescue`, before a step it rescues runs again, once that step
 * failed. Like a step, it is built anew for its attempt, its `run` reports
 * how the attempt went, and it reports something abnormal by throwing.
 *
 * Only a class extending `RescueStep` is a rescue step, whether it is
 * declared with {@link rescueStep} or given to a workflow's builder.
 *
 * {@includeCode ../../examples/rescue-step.ts}
 */
export abstract class RescueStep {
  // eslint-disable-next-line no-unused-private-class-members -- only a class extending RescueStep has this field, so only such a class has the type of a rescue step
  readonly #rescueStep = true;

  /**
   * Runs the rescue step's attempt, and reports how it went. It may be
   * synchronous or asynchronous: itinera waits for the outcome either way.
   */
  abstract run(...requests: never[]): RescueOutcome | Promise<RescueOutcome>;

  /** The outcome of an attempt that did its work. */
  protected succeed(): RescueOutcome {
    return success;
  }
}

/**
 * A class extending {@link RescueStep}, which itinera builds for its attempt.
 *
 * {@includeCode ../../examples/rescue-step.ts}
 */
export interface RescueStepClass {
  /** Builds the rescue step for its attempt. */
  new (...needs: never[]): RescueStep;
  /** The prototype every rescue step of the class shares. */
  readonly prototype: RescueStep;
}

const declared = new WeakMap<RescueStepClass, StepRequests>();

/**
 * Declares a rescue step: a class extending {@link RescueStep} directly. A
 * step names it as the `rescue` of its `@withStep`, which accepts only a
 * class declared with `@rescueStep`.
 *
 * Every parameter of its constructor and of its `run` is a request, marked
 * with the decorator of what it requests: `@input`, `@fromRescuedStep`,
 * `@failureReason` and `@error` on the constructor's, `@service`,
 * `@contributor` and `@stepReporter` on those of `run`.
 *
 * {@includeCode ../../examples/rescue-step.ts}
 *
 * @throws Error, when the class is defined, if it does not extend
 * `RescueStep` itself, if it is declared twice, or if a parameter has no
 * request.
 */
export function rescueStep(): (target: RescueStepClass) => void {
  return (target) => {
    if (Object.getPrototypeOf(target) !== RescueStep) {
      throw new Error(`${target.name} must extend RescueStep itself`);
    }
    if (declared.has(target)) {
      throw new Error(`${target.name} is declared with @rescueStep twice`);
    }
    declared.set(target, {
      needs: requestsOf(target, undefined),
      run: requestsOf(target, "run"),
    });
  };
}

/**
 * The requests of the rescue step `target`, as `@rescueStep` recorded them,
 * or `undefined` if it is not declared with it.
 */
export function requestsOfRescue(
  target: RescueStepClass,
): StepRequests | undefined {
  return declared.get(target);
}

/**
 * Requests data from the step a rescue step rescues, on a parameter of its
 * constructor: what that step contributed under `key` in the attempt that
 * failed, checked by `type`. With no type written, the parameter's own type
 * is checked, as the compiler records it, which it can say only for
 * `number`, `string`, `boolean` and a class that serialises itself.
 *
 * The data is required unless `type` is wrapped in `optional`.
 *
 * {@includeCode ../../examples/rescue-step.ts}
 *
 * @throws Error, when the class is defined, if no type is written and the
 * compiler recorded none it can say.
 */
export function fromRescuedStep<T extends RequestType | undefined = undefined>(
  key: string,
  type?: T,
): ValueRequestDecorator<T, Place<RescueStepClass, undefined>> {
  return marking((target, method, index) => ({
    kind: "fromRescuedStep",
    key,
    type: checkedOf(type, target, method, index),
  }));
}
