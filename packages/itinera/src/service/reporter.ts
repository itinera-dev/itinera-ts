import { marking } from "../declaration/marking.js";
import type { Place, RequestDecorator } from "../declaration/parameter.js";
import type { AsValue } from "../value.js";
import type { Workflow } from "../workflow.js";

/**
 * Requests a provider reporter, in a service provider, for its own events
 * and for setting global metadata.
 *
 * {@includeCode ../../examples/provider.ts}
 */
export function providerReporter(): RequestDecorator<
  ProviderReporter,
  Place<Workflow, string | symbol>
> {
  return marking({ kind: "providerReporter" });
}

/**
 * What a service provider reports through during one call: its own events,
 * `journey_info`, `journey_warning` and `journey_error`, each with a message
 * and, optionally, data, and global metadata. Each event names the provider,
 * the step being built and its attempt. itinera makes one for each call and
 * closes it when the call ends.
 *
 * Each call settles once every reporter has been given what it reports, so
 * await it; itinera keeps the order of calls a provider does not await.
 *
 * {@includeCode ../../examples/provider.ts}
 */
export interface ProviderReporter {
  /** Emits `journey_info`, with `message` and, if given, `data`. */
  info<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Emits `journey_warning`, with `message` and, if given, `data`. */
  warning<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Emits `journey_error`, with `message` and, if given, `data`. */
  error<T>(message: string, data?: T & AsValue<T>): Promise<void>;
  /** Sets the global metadata `key` to `value` on every reporter. */
  setGlobalMetadata<T>(key: string, value: T & AsValue<T>): Promise<void>;
}
