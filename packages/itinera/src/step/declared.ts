import {
  refuseConstructorParameters,
  refuseMethodParameters,
} from "../declaration.js";
import { Step, type StepClass } from "../step.js";

const declared = new WeakSet<StepClass>();

/**
 * Declares a step: a class extending {@link Step} directly, whose `run`
 * makes its outcome. A workflow lists it with `@withStep`, which accepts only
 * a class declared with `@step`.
 *
 * Every parameter of the step's constructor and of its `run` is a request,
 * marked with the decorator of what it requests.
 *
 * {@includeCode ../../examples/step.ts}
 *
 * @throws Error, when the class is defined, if it does not extend `Step`
 * itself, if it is declared twice, or if a parameter has no request.
 */
export function step(): (target: StepClass) => void {
  return (target) => {
    if (Object.getPrototypeOf(target) !== Step) {
      throw new Error(`${target.name} must extend Step itself`);
    }
    if (declared.has(target)) {
      throw new Error(`${target.name} is declared with @step twice`);
    }
    checkParameters(target);
    declared.add(target);
  };
}

/**
 * Throws if a parameter of the constructor of `target` or of its `run` has
 * no request.
 */
export function checkParameters(target: StepClass): void {
  refuseConstructorParameters(target);
  refuseMethodParameters(target.prototype, "run");
}

/** Whether `target` was declared with {@link step}. */
export function isDeclared(target: StepClass): boolean {
  return declared.has(target);
}
