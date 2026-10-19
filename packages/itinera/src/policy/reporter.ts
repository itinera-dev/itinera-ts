import { marking } from "../declaration/marking.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { AsValue } from "../value.js";
import type { StepPolicy } from "./step-policy.js";
import type { WorkflowPolicy } from "./workflow-policy.js";

/**
 * Requests a hook reporter, in a hook, for the hook's own events and for
 * setting global metadata.
 *
 * {@includeCode ../../examples/hook-reporter.ts}
 */
export function hookReporter(): RequestDecorator<
  HookReporter,
  Place<StepPolicy | WorkflowPolicy, string | symbol>
> {
  return marking({ kind: "hookReporter" });
}

/**
 * What a hook reports through during one call: its own events,
 * `journey_info`, `journey_warning` and `journey_error`, each with a message
 * and, optionally, data, and global metadata. Each event names the policy
 * and the hook, and, for a step hook, the step and its attempt. itinera
 * makes one for each call and closes it when the call ends.
 *
 * Each call settles once every reporter has been given what it reports, so
 * await it; itinera keeps the order of calls a hook does not await.
 *
 * {@includeCode ../../examples/hook-reporter.ts}
 */
export interface HookReporter {
  /** Emits `journey_info`, with `message` and, if given, `data`. */
  info<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Emits `journey_warning`, with `message` and, if given, `data`. */
  warning<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Emits `journey_error`, with `message` and, if given, `data`. */
  error<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Sets the global metadata `key` to `value` on every reporter. */
  setGlobalMetadata<T>(key: string, value: T & AsValue<T>): Promise<void>;
}
