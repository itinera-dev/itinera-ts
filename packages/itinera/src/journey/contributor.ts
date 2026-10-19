import { marking } from "../declaration.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { Step } from "../step.js";
import type { AsValue } from "../value.js";

/**
 * What a step contributes data back through, during one attempt: values by
 * key, which reach the data bag only if the attempt succeeds. itinera makes
 * one for each attempt and closes it when the attempt ends.
 *
 * {@includeCode ../../examples/contributor.ts}
 */
export interface Contributor {
  /**
   * Contributes `value` under `key`, captured as it is now. The last value
   * contributed under a key in an attempt wins.
   */
  contribute<T>(key: string, value: T & AsValue<T>): void;
}

/**
 * Requests a contributor, in a step's `run`.
 *
 * {@includeCode ../../examples/contributor.ts}
 */
export function contributor(): RequestDecorator<
  Contributor,
  Place<Step, "run">
> {
  return marking(() => ({ kind: "contributor" }));
}
