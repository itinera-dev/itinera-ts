import { marking } from "../declaration/marking.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { StepPolicy, WorkflowPolicy } from "../policy.js";
import type { Step } from "../step.js";
import type { RescueStep } from "../step/rescue.js";
import type { AsValue } from "../value.js";

/**
 * What a step or a hook contributes data back through: values by key, which
 * reach the data bag only if the step's attempt succeeds, or as soon as the
 * hook returns without failing. itinera makes one for each attempt or call,
 * and closes it when the attempt or the call ends.
 *
 * {@includeCode ../../examples/contributor.ts}
 */
export interface Contributor {
  /**
   * Contributes `value` under `key`, captured as it is now. The last value
   * contributed under a key in an attempt or a call wins.
   */
  contribute<T>(key: string, value: T & AsValue<T>): void;
}

/**
 * Requests a contributor, in the `run` of a step or a rescue step, or in a
 * hook.
 *
 * {@includeCode ../../examples/contributor.ts}
 */
export function contributor(): RequestDecorator<
  Contributor,
  | Place<Step | RescueStep, "run">
  | Place<StepPolicy | WorkflowPolicy, string | symbol>
> {
  return marking({ kind: "contributor" });
}
