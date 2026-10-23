import { checkedOf, marking } from "../declaration.js";
import type {
  Place,
  RequestDecorator,
  ValueRequestDecorator,
} from "../declaration/parameter.js";
import type { Step, StepClass } from "../step.js";
import type { AsValue } from "../value.js";
import type { RequestType } from "../value/token.js";

/**
 * Requests one of a step's inputs, on a parameter of its constructor: the
 * value under `key`, from the step's input adapter or the data bag, checked
 * by `type`. With no type written, the parameter's own type is checked, as
 * the compiler records it, which it can say only for `number`, `string`,
 * `boolean` and a class that serialises itself.
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
): ValueRequestDecorator<T, Place<StepClass, undefined>> {
  return marking((target, method, index) => ({
    kind: "input",
    key,
    type: checkedOf(type, target, method, index),
  }));
}

/**
 * Requests a step reporter, in a step's `run`, for the step's own events and
 * for setting global metadata.
 *
 * {@includeCode ../../examples/step-reporter.ts}
 */
export function stepReporter(): RequestDecorator<
  StepReporter,
  Place<Step, "run">
> {
  return marking(() => ({ kind: "stepReporter" }));
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
