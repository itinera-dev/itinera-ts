/**
 * Steps: the work of a workflow, what a step is called, its attempts, its
 * outcomes, and the reasons it gives.
 *
 * @module
 */
import { type Outcome, success } from "./step/outcome.js";
import type { PlainValue } from "./value.js";

export { Attempt } from "./step/attempt.js";
export { step } from "./step/declared.js";
export type { StepDescriptor, StepOptions } from "./step/descriptor.js";
export type { Outcome, Success } from "./step/outcome.js";
export {
  attempt,
  error,
  failureReason,
  type FromFailure,
  type FromFailureOptions,
  input,
  stepName,
  stepReporter,
  type StepReporter,
} from "./step/request.js";

declare const stepName: unique symbol;

/**
 * The name of a step: a string that is never empty, checked when the
 * workflow is declared, so a plain string is not mistaken for one.
 *
 * {@includeCode ../examples/names.ts}
 */
export type StepName = string & {
  /** Marks the string as a step name made by itinera. */
  readonly [stepName]: true;
};

/**
 * Why a step failed or was skipped, or why a hook failed the journey: a code,
 * and optionally a message and details, as events and the result carry it.
 *
 * The details are a value, captured when the reason was given, so changing
 * what was given afterwards changes nothing here.
 *
 * {@includeCode ../examples/reason.ts}
 */
export interface Reason {
  /** A short code a program can compare, such as `"declined"`. */
  readonly code: string;
  /** A message for people. */
  readonly message?: string;
  /** Anything else the reason says, as a value. */
  readonly details?: PlainValue;
}

/**
 * The base class of every step: one unit of work in a workflow, built anew
 * for each attempt, which reports how the attempt went by the outcome its
 * `run` returns, made with the helpers this class gives it.
 *
 * A step reports something abnormal by throwing, or by returning a rejected
 * promise: that is an abnormal termination of the attempt, which its workflow
 * may retry. Only a class extending `Step` is a step, whether it is declared
 * with {@link step} or given to a workflow's builder.
 *
 * {@includeCode ../examples/step.ts}
 */
export abstract class Step {
  // eslint-disable-next-line no-unused-private-class-members -- only a class extending Step has this field, so only such a class has the type of a step
  readonly #step = true;

  /**
   * Runs one attempt of the step, and reports how it went. It may be
   * synchronous or asynchronous: itinera waits for the outcome either way.
   */
  abstract run(...requests: never[]): Outcome | Promise<Outcome>;

  /** The outcome of an attempt that did its work. */
  protected succeed(): Outcome {
    return success;
  }
}

/**
 * A class extending {@link Step}, which itinera builds for each attempt.
 *
 * {@includeCode ../examples/descriptors.ts}
 */
export interface StepClass {
  /** Builds a step for one attempt. */
  new (...needs: never[]): Step;
  /** The prototype every step of the class shares. */
  readonly prototype: Step;
}
