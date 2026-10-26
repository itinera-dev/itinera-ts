import type { Reason } from "../../step.js";
import type { AsValue } from "../../value.js";
import type { Level } from "../emitted.js";
import type { StepScript } from "../scripted.js";

/**
 * The attempts chosen contribute, then go on as {@link AttemptEmitting}.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export interface AttemptContributing extends AttemptEmitting {
  /**
   * The attempts contribute `value` under `key`, committed only when an
   * attempt succeeds, as a step's contributions are.
   *
   * @throws TestMistake when the step declares no contributor.
   */
  willContribute<T>(key: string, value: T & AsValue<T>): AttemptContributing;
}

/**
 * The attempts chosen emit events, then go on as
 * {@link AttemptSettingGlobalMetadata}.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export interface AttemptEmitting extends AttemptSettingGlobalMetadata {
  /**
   * The attempts emit an event at `level`, with `message` and, if given,
   * `data`, as the step's reporter would.
   *
   * @throws TestMistake when the step declares no reporter.
   */
  willEmit<T = undefined>(
    level: Level,
    message: string,
    data?: T & AsValue<T>,
  ): AttemptEmitting;
}

/**
 * The attempts chosen set global metadata, then end.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export interface AttemptSettingGlobalMetadata extends AttemptEndings {
  /**
   * The attempts set the global metadata `key` to `value`, as the step's
   * reporter would.
   *
   * @throws TestMistake when the step declares no reporter.
   */
  willSetGlobalMetadata<T>(
    key: string,
    value: T & AsValue<T>,
  ): AttemptSettingGlobalMetadata;
}

/**
 * How the attempts chosen end: the outcome the step reports, with the same
 * consequences, or an abnormal termination, as an error escaping its `run`.
 *
 * {@includeCode ../../../examples/scripted.ts}
 */
export interface AttemptEndings {
  /** The attempts succeed. */
  willSucceed(): StepScript;
  /** The attempts fail, for `reason`, or a reason with only this code. */
  willFail(reason: Reason | string): StepScript;
  /**
   * The step skips itself, giving no reason.
   *
   * @throws TestMistake for a rescue step, which cannot skip.
   */
  willSkip(): StepScript;
  /**
   * The step skips itself, for `reason`, or a reason with only this code.
   *
   * @throws TestMistake for a rescue step, which cannot skip.
   */
  willSkipBecause(reason: Reason | string): StepScript;
  /** The attempts terminate abnormally, with an error carrying `errorMessage`. */
  willTerminateAbnormally(errorMessage: string): StepScript;
}
