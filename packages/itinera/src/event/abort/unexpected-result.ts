import type { StepName } from "../../step.js";
import type {
  ByAdapterForKey,
  ByPolicy,
  ByProviderForKey,
  ByStep,
  ByStepHook,
} from "../source.js";

/**
 * Custom code returned something its call cannot return, such as `undefined`
 * where an outcome is awaited, which only a cast or `any` lets through. It is
 * not a failure of that code, so it carries no error, and it is never
 * retried.
 *
 * {@includeCode ../../../examples/journey-abort.ts}
 */
export interface UnexpectedResult {
  /** Why the journey was aborted. */
  readonly reason: "unexpected result";
  /** The name of the step being attempted, or the rescue step's. */
  readonly step: StepName;
  /**
   * What returned it: the step's or rescue step's own `run` or constructor, a
   * step hook, an input adapter with the key of the input it was resolving, a
   * service provider with the key of the service, or a step policy's
   * constructor.
   */
  readonly source:
    ByStep | ByStepHook | ByAdapterForKey | ByProviderForKey | ByPolicy;
  /** What was returned, and by whom, for the people reading it. */
  readonly message: string;
}
