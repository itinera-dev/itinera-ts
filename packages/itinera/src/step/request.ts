import { checkedOf, marking } from "../declaration.js";
import type {
  Place,
  RequestDecorator,
  ValueRequestDecorator,
} from "../declaration/parameter.js";
import type { Option } from "../option.js";
import type { StepPolicy } from "../policy.js";
import type { Reason, Step, StepClass, StepName } from "../step.js";
import type { Workflow } from "../workflow.js";
import type { AsValue } from "../value.js";
import type { Attempt } from "./attempt.js";
import type { RescueStep, RescueStepClass } from "./rescue.js";
import type { RequestType } from "../value/token.js";

/**
 * Requests one of the inputs of a step or a rescue step, on a parameter of
 * its constructor: the value under `key`, from the step's input adapter or
 * the data bag, checked by `type`. With no type written, the parameter's
 * own type is checked, as the compiler records it, which it can say only for
 * `number`, `string`, `boolean` and a class that serialises itself.
 *
 * An input is required unless `type` is wrapped in `optional`.
 *
 * {@includeCode ../../examples/requests.ts}
 *
 * @throws Error, when the class is defined, if no type is written and the
 * compiler recorded none it can say.
 */
export function input<T extends RequestType | undefined = undefined>(
  key: string,
  type?: T,
): ValueRequestDecorator<T, Place<StepClass | RescueStepClass, undefined>> {
  return marking((target, method, index) => ({
    kind: "input",
    key,
    type: checkedOf(type, target, method, index),
  }));
}

/**
 * Requests a step reporter, in the `run` of a step or a rescue step, for the
 * step's own events and for setting global metadata.
 *
 * {@includeCode ../../examples/step-reporter.ts}
 */
export function stepReporter(): RequestDecorator<
  StepReporter,
  Place<Step | RescueStep, "run">
> {
  return marking(() => ({ kind: "stepReporter" }));
}

/**
 * Requests the name of the step a step hook acts on, or, in an input adapter
 * or a service provider of attempt scope, of the step being built.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function stepName(): RequestDecorator<
  StepName,
  Place<StepPolicy | Workflow, string | symbol>
> {
  return marking(() => ({ kind: "stepName" }));
}

/**
 * Requests the attempt a step hook acts on, or, in a service provider of
 * attempt scope, the attempt being built.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function attempt(): RequestDecorator<
  Attempt,
  Place<StepPolicy | Workflow, string | symbol>
> {
  return marking(() => ({ kind: "attempt" }));
}

/**
 * What a request for the failure's reason or the error says.
 *
 * {@includeCode ../../examples/policy.ts}
 *
 * @typeParam O Whether the request is optional.
 */
export interface FromFailureOptions<O extends boolean> {
  /**
   * `true` to be given `None` when there is none, rather than aborting the
   * journey: a reason exists only when the attempt reported a failure, and
   * an error only when it ended in an abnormal termination.
   */
  readonly optional?: O;
}

/**
 * What a request for the failure's reason or the error gives: `T`, or, when
 * it is optional, `Some` of it or `None`.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export type FromFailure<T, O extends boolean> = O extends true ? Option<T> : T;

/**
 * Requests, in a step hook, the reason the attempt it acts on reported with
 * its failure, or, in a rescue step's constructor, the reason the step it
 * rescues reported: required unless `optional` is `true`.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function failureReason<O extends boolean = false>(
  options: FromFailureOptions<O> = {},
): RequestDecorator<
  FromFailure<Reason, O>,
  Place<StepPolicy, string | symbol> | Place<RescueStepClass, undefined>
> {
  return marking(() => ({
    kind: "failureReason",
    optional: options.optional === true,
  }));
}

/**
 * Requests, in a step hook, what the attempt it acts on threw when it ended
 * in an abnormal termination, or, in a rescue step's constructor, what the
 * step it rescues threw: required unless `optional` is `true`.
 *
 * {@includeCode ../../examples/policy.ts}
 */
export function error<O extends boolean = false>(
  options: FromFailureOptions<O> = {},
): RequestDecorator<
  FromFailure<unknown, O>,
  Place<StepPolicy, string | symbol> | Place<RescueStepClass, undefined>
> {
  return marking(() => ({
    kind: "error",
    optional: options.optional === true,
  }));
}

/**
 * What a step reports through during one attempt: its own events, each
 * with a message and, optionally, data, and global metadata. itinera makes
 * one for each attempt and closes it when the attempt ends.
 *
 * Each call settles once every reporter has been given what it reports, so
 * await it; itinera keeps the order of calls a step does not await.
 *
 * {@includeCode ../../examples/step-reporter.ts}
 */
export interface StepReporter {
  /** Emits `step_info`, with `message` and, if given, `data`. */
  info<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Emits `step_warning`, with `message` and, if given, `data`. */
  warning<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /**
   * Emits `step_error`, with `message` and, if given, `data`. It does not
   * change the step's outcome.
   */
  error<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Sets the global metadata `key` to `value` on every reporter. */
  setGlobalMetadata<T>(key: string, value: T & AsValue<T>): Promise<void>;
}
